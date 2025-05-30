// src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import intentRouter from './router/intent';
import verifyRouter from './router/verify';
import { clearChatHistory } from './db/gptHistoryCache';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


app.use('/api/intent', intentRouter);

app.use('/api/verify', verifyRouter);

app.get('/api/clear', async (req, res) => {
  const wallet = req.query.wallet as string;
  if (!wallet) { 
    res.json({ ok: false, error: 'Missing wallet address' }); 
  }else{
    await clearChatHistory(wallet);
     res.json({ ok: true, message: 'Chat history cleared' });
  }
});

app.listen(port, () => {
  console.log(`Web3Mind server is running at http://localhost:${port}`);
});
