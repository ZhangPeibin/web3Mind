// src/router/intent.ts
import express, { Router } from 'express';
import { askIntent } from '../ai/chat';
import { logIntent } from '../db/sql/intent';

const router: Router = express.Router();

router.post('/', async (req: any, res: any) => {
    const { wallet, message } = req.body;
    console.log(message)
    if (!message) {
        return res.status(400).json({ error: 'Missing user message' });
    }

    try {
        const result = await askIntent(wallet,message);

        await logIntent(message, result);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Unknown error' });
    }
});

export default router;
