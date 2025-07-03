// src/openai/chat.ts
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();
import { SocksProxyAgent } from 'socks-proxy-agent';
import { getChatHistory, saveChatMessage } from '../db/gptHistoryCache';
import { okxClient } from '../api/okxDexClient';
import { SYSTEM_PROMPT } from './prompt';
import { addressAssets, allToken } from '../api/okxApi';

const proxyUrl = 'socks5://127.0.0.1:7898'; // 替换为你的 VPN 代理地址和端口
const agent = new SocksProxyAgent(proxyUrl);

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
    apiKey,
    httpAgent: agent
});

// 用于缓存用户线程 ID（实际可用 Redis）
const userThreadMap = new Map<string, string>();
let assistantId = '';

async function setupAssistant() {
    if (assistantId) return assistantId;
    const systemPrompt = SYSTEM_PROMPT();

    const assistant = await openai.beta.assistants.create({
        name: 'Web3 Assistant',
        instructions: systemPrompt,
        tools: [
            {
                type: 'function',
                function: {
                    name: 'getPortfolio',
                    description: '获取用户链上资产信息',
                    strict: true,
                    parameters: {
                        type: 'object',
                        properties: {
                            address: { type: 'string' },
                            chainId: { type: 'string' }
                        },
                        required: ['address', 'chainId'],
                        additionalProperties: false

                    }
                }
            }
        ],
        model: 'gpt-4-turbo'
    });
    assistantId = assistant.id;
    return assistantId;
}

export async function askIntent(chainId: string, address: string, message: string) {
    const assistantId = await setupAssistant();

    let threadId = userThreadMap.get(address);
    if (!threadId) {
        const thread = await openai.beta.threads.create();
        threadId = thread.id;
        userThreadMap.set(address, threadId);
    }

    await openai.beta.threads.messages.create(
        threadId,
        {
            role: 'user',
            content: `My address is ${address}, and I use chain ${chainId}.`
        });


    await openai.beta.threads.messages.create(
        threadId,
        {
            role: 'user',
            content: message
        }
    );

    const run = await openai.beta.threads.runs.create(
        threadId,
        {
            assistant_id: assistantId,
        }
    );

    // 等待任务完成（简单轮询）
    let runStatus;
    do {
        await new Promise(r => setTimeout(r, 500));
        runStatus = await openai.beta.threads.runs.retrieve(
            threadId,
            run.id
        );

        // 如果需要调用工具函数
        console.log('runStatus', runStatus.status);

        if (runStatus.status === 'requires_action' && runStatus.required_action) {
            const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;

            const toolOutputs = await Promise.all(toolCalls.map(async (toolCall: any) => {
                const fnName = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);


                if (fnName === 'getPortfolio') {
                    const portfolio = await addressAssets(args.chainId, args.address);
                    
                    return {
                        tool_call_id: toolCall.id,
                        output: JSON.stringify(portfolio)
                    };
                }

                return {
                    tool_call_id: toolCall.id,
                    output: 'Function not implemented'
                };
            }));
            console.log('toolOutputs', toolOutputs);
            await openai.beta.threads.runs.submitToolOutputs(
                threadId,
                run.id,
                {
                    tool_outputs: toolOutputs
                }
            );
        }
    } while (runStatus.status !== 'completed');
    const messages = await openai.beta.threads.messages.list(threadId);
    const last = messages.data.find(m => m.role === 'assistant');
    const textContent = last?.content.find(c => c.type === 'text');
    const gptReply = textContent && 'text' in textContent ? textContent.text.value : '{}';

    console.log('ai_res', gptReply);

    await saveChatMessage(address, 'user', message);
    await saveChatMessage(address, 'assistant', gptReply);

    try {
        return JSON.parse(gptReply);
    } catch (err) {
        return { intent: 'unknown', error: 'Failed to parse JSON from OpenAI response' };
    }
}
