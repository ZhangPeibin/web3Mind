// src/openai/chat.ts
import { OpenAI } from 'openai';
import { SYSTEM_PROMPT } from './prompt';
import dotenv from 'dotenv';
dotenv.config();
import { SocksProxyAgent } from 'socks-proxy-agent';
import { getChatHistory, saveChatMessage } from '../db/gptHistoryCache';

const proxyUrl = 'socks5://127.0.0.1:7898'; // 替换为你的 VPN 代理地址和端口
const agent = new SocksProxyAgent(proxyUrl);

const apiKey = process.env.OPENAI_API_KEY;
console.log('apiKey', apiKey);
const openai = new OpenAI({
  apiKey: apiKey,
  httpAgent: agent
});

export async function askIntent(wallet:string,message: string) {
  const systemPrompt = SYSTEM_PROMPT();
  const history = await getChatHistory(wallet);

  const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((h: any) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user', content: message }]
  console.log('messages',messages)
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: messages,
    temperature: 0.3,
  });
  const gptReply = completion.choices[0].message.content || '{}';
  console.log('ai_res', gptReply)
  await saveChatMessage(wallet, 'user', message);
  await saveChatMessage(wallet, 'assistant', gptReply);

  try {
    return JSON.parse(gptReply);
  } catch (err) {
    console.error('❌ JSON 解析失败:', gptReply);
    return { intent: 'unknown', error: 'Failed to parse JSON from OpenAI response' };
  }
}
