import type { OpenRouterMessage, OpenRouterRequest, OpenRouterResponse } from "./type";

class LLMClient {
    private apiKey: string;
    private baseUrl = 'https://openrouter.ai/api/v1';

    constructor() {
        if (!process.env.CHAT_WITH_DOCUMENT_LLM_KEY) {
            throw new Error('OpenRouter API key not found');
        }
        this.apiKey = process.env.CHAT_WITH_DOCUMENT_LLM_KEY;
    }

    async chat(request: OpenRouterRequest): Promise<OpenRouterResponse> {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://chat-with-document.com', // Optional
                'X-Title': 'Chat With Document', // Optional
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
        }

        return response.json() as unknown as OpenRouterResponse;
    }

    async chatWithContext(
        query: string,
        context?: string,
        conversationHistory?: OpenRouterMessage[],
        model = 'anthropic/claude-3.5-sonnet'
    ): Promise<string> {
        const messages: OpenRouterMessage[] = [];

        // Add system context
        if (context) {
            messages.push({
                role: 'system',
                content: context
            });
        }

        // Add conversation history
        if (conversationHistory) {
            messages.push(...conversationHistory);
        }

        // Add current query
        messages.push({
            role: 'user',
            content: query
        });
        console.log(`Getting LLM response for query: ${JSON.stringify(messages)}`)
        const response = await this.chat({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 1000,
            stream: false,
        });

        console.log(`LLM response for query: ${JSON.stringify(response)}`)
        return response.choices[0]?.message?.content || '';
    }
}

export default LLMClient