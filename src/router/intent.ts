// src/router/intent.ts
import express, { Router } from 'express';
import { askIntent } from '../ai/assistants';
import { logIntent } from '../db/sql/intent';
import { jwtAuthMiddleware } from '../middlewares/auth';
import { error } from 'console';
import { errorResponse, Errors } from '../utils/response';

const router: Router = express.Router();

//jwtAuthMiddleware as any
router.post('/', async (req: any, res: any) => {
    const { address, message,chainId } = req.body;
    if (!message) {
        return errorResponse(res, 400, Errors.missingParam('message'));
    }
    
    try {
        const result = await askIntent(chainId,address,message);

        await logIntent(message, result);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Unknown error' });
    }
});

export default router;
