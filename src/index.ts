// src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import intentRouter from './router/intent';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


app.use('/api/intent', intentRouter);

app.listen(port, () => {
  console.log(`Web3Mind server is running at http://localhost:${port}`);
});
