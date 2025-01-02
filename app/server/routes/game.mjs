import express from 'express';
import Database from 'better-sqlite3';

import {
    postPlayer,
    getPlayersAmount,
    getNextGameSession,
    getGameSessionByID
} from "../modules/game_index.mjs";


const db = new Database('./app/database.db', { verbose: console.log });
const gameRouter = express.Router();


gameRouter.post('/add-player', (req, res) => {
    try {
        if (!req.body.player_telegram_id || !req.body.player_name || !req.body.session_id) {
            res.status(400).json({
                success: false,
                message: 'Недостаточно данных для добавления игрока в список игроков.'
            });
            return;
        };
        
        const postPlayerResult = postPlayer(
            db,
            req.body.session_id,
            req.body.player_telegram_id,
            req.body.player_name
        );

        res.status(postPlayerResult.status).json(postPlayerResult);
    } catch (error) {
        console.error(`Error in /game/add-player: ${error}`);
        res.status(500).json({
            success: false,
            message: 'Произошла ошибка при добавлении игрока в список игроков.'
        });
    };
});


gameRouter.get('/get-players-amount', (req, res) => {
    try {
        const getPlayersAmountResult = getPlayersAmount(db, req.query.session_id);

        res.status(getPlayersAmountResult.status).json(getPlayersAmountResult);
    } catch (error) {
        console.error(`Error in /game/get-players-amount: ${error}`);
        res.status(500).json({
            success: false,
            message: 'Произошла ошибка при получении количества игроков.'
        });
    };
});


gameRouter.get('/get-next-game-session', (req, res) => {
    try {
        const getNextGameSessionResult = getNextGameSession(db);

        res.status(getNextGameSessionResult.status).json(getNextGameSessionResult);
    } catch (error) {
        console.error(`Error in /game/get-next-game-session: ${error}`);
        res.status(500).json({
            success: false,
            message: 'Произошла ошибка при получении игрового сеанса.'
        });
    };
});


gameRouter.get('/get-game-session-by-id', (req, res) => {
    try {
        const sessionID = parseInt(req.query.session_id, 10);
        if (isNaN(sessionID)) {
            return res.status(400).json({
                success: false,
                message: 'Недопустимый идентификатор игрового сеанса.'
            });
        };
        
        const gameSession = getGameSessionByID(db, sessionID);

        if (!gameSession.success) {
            return res.status(gameSession.status).json(gameSession);
        };

        const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
        const sessionDate = new Date(gameSession.gameSession.session_date).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
        const countdownMinutes = gameSession.gameSession.countdown_timer || 0;
        
        const endTime = new Date(sessionDate);
        endTime.setMinutes(endTime.getMinutes() + countdownMinutes);

        let remainingTime = 0;
        let status = 'finished';

        if (!gameSession.gameSession.started) {
            remainingTime = Math.max((new Date(sessionDate) - new Date(now)) / 1000, 0);
            status = 'pending';
        } else if (gameSession.gameSession.started && !gameSession.gameSession.finished) {
            remainingTime = Math.max((endTime - new Date(now)) / 1000, 0);
            status = 'ongoing';
        };

        return res.status(200).json({
            'success': true,
            'session_id': gameSession.gameSession.id,
            'remaining_time': Math.round(remainingTime),
            'start_time': sessionDate,
            'end_time': endTime.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
        })
    } catch (error) {
        console.error(`Error in /game/get-game-session-by-id: ${error}`);
        res.status(500).json({
            success: false,
            message: 'Произошла ошибка при получении игрового сеанса.'
        });
    };
});


export default gameRouter;
