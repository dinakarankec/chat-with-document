import type { QueryResult } from "chromadb";

export interface ContextChunk {
    source: string;
    page: number;
    chunk_index: number;
    content: string;
    relevance_score: number;
    distance: number;
}

export interface OpenRouterMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface OpenRouterRequest {
    model: string;
    messages: OpenRouterMessage[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stream?: boolean;
}

export interface OpenRouterResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    confidence: number;
    choices: {
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}



export interface RAGResponse {
    answer: string;
    sources: QueryResult[];
    query: string;
    confidence: number;
    context_used: number;
    chunks_analyzed: ContextChunk[];
}
