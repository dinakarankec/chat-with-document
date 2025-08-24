import { createOpenRouter, type OpenRouterProvider } from '@openrouter/ai-sdk-provider';
import { convertToModelMessages, generateText, stepCountIs, type GenerateTextResult } from 'ai';
import { z } from 'zod';
import EmbeddingService from '../../embeddings/EmbeddingService';
import Storage from '../../storage';




class LLMClientV2 {
    private openRouter: OpenRouterProvider;
    private embeddingService: EmbeddingService;
    private storage: Storage;

    constructor() {
        if (!process.env.CHAT_WITH_DOCUMENT_LLM_KEY) {
            throw new Error('OpenRouter API key not found');
        }
        this.openRouter = createOpenRouter({
            apiKey: process.env.CHAT_WITH_DOCUMENT_LLM_KEY,
        });
        this.embeddingService = new EmbeddingService();
        this.storage = new Storage();
    }

    getUserPrompt = (userQuery: string) => {
        return convertToModelMessages([
            {
                role: 'user',
                parts: [
                    {
                        type: 'text',
                        text: userQuery
                    }
                ]
            },
        ])
    }

    async chat(userQuery: string, systemPrompt: string): Promise<GenerateTextResult<any, string>> {
        const result = await generateText({
            model: this.openRouter.chat('deepseek/deepseek-chat-v3.1'),
            system: systemPrompt,
            messages: this.getUserPrompt(userQuery),
            stopWhen: stepCountIs(5),

            tools: {
                getInformation: {
                    name: 'getInformation',
                    description: 'Use this tool to search for relevant information to answer the user query.',
                    inputSchema: z.object({
                        uniqueDocumentId: z.string().describe('The unique document id'),
                        query: z.string().describe('The search query'),
                        topK: z.number().describe('The number of results to return'),
                    }),
                    execute: async ({ uniqueDocumentId, query, topK }) => {
                        console.log(query, uniqueDocumentId, topK)
                        const embeddings = await this.embeddingService.generateEmbeddings([query]);
                        const results = await this.storage.searchEmbeddings(embeddings, uniqueDocumentId, topK);
                        console.log(results.ids)
                        return results;
                    }
                }
            }
        });
        console.log(result.text)
        console.log("Steps: ", result.steps.length)
        console.log(result.usage)
        return result;
    }
}

export default LLMClientV2