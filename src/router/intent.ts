// src/router/intent.ts
import express, { Router } from 'express';
import { askIntent } from '../ai/chat';
import { logIntent } from '../log/log';

const router: Router = express.Router();

router.post('/', async (req: any, res: any) => {
    const userMessage = req.body.message;
    console.log(userMessage)
    if (!userMessage) {
        return res.status(400).json({ error: 'Missing user message' });
    }

    try {
        const result = await askIntent(userMessage);

        await logIntent(userMessage, result);

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Unknown error' });
    }
});

export default router;
