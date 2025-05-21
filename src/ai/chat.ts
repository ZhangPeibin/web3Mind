// src/openai/chat.ts
import { OpenAI } from 'openai';
import { AIPrompt } from './prompt';
import dotenv from 'dotenv';
dotenv.config();
import { SocksProxyAgent } from 'socks-proxy-agent';

const proxyUrl = 'socks5://127.0.0.1:7898'; // 替换为你的 VPN 代理地址和端口
const agent = new SocksProxyAgent(proxyUrl);

const apiKey  = process.env.OPENAI_API_KEY;
console.log('apiKey',apiKey);
const openai = new OpenAI({
  apiKey: apiKey,
  httpAgent:agent
});

export async function askIntent(message: string) {
  const prompt = AIPrompt(message);
  console.log('prompt',prompt)
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo', 
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });
  const response = completion.choices[0].message.content || '{}';
  console.log('ai_res',response)

  try {
    return JSON.parse(response);
  } catch (err) {
    console.error('❌ JSON 解析失败:', response);
    return { intent: 'unknown', error: 'Failed to parse JSON from OpenAI response' };
  }
}
