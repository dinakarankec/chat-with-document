import type { Metadata, QueryResult } from "chromadb";
import EmbeddingService from "../embeddings/EmbeddingService";
import Storage from "../storage";
import RAGUtils from './RAGUtils';
import type { RAGResponse } from "./type";
import LLMClient from "./LLMClient";
import LLMClientV2 from "./LLMClientV2/LLMClientV2";

class RAGSystem {
    private embeddingService: EmbeddingService;
    private storage: Storage;
    private relevanceThreshold: number;
    private llmClient: LLMClient;
    private llmClientV2: LLMClientV2;

    constructor(
        relevanceThreshold: number = 1.5
    ) {
        this.storage = new Storage();
        this.embeddingService = new EmbeddingService();
        this.relevanceThreshold = relevanceThreshold;
        this.llmClient = new LLMClient();
        this.llmClientV2 = new LLMClientV2();
    }

    async query(
        userQuestion: string,
        uniqueDocumentId: string
    ): Promise<RAGResponse> {
        try {
            // 1. Vector similarity search
            console.log(`Searching for relevant documents for query: ${userQuestion}`);
            const embeddings = await this.embeddingService.generateEmbeddings([userQuestion]);
            const results: QueryResult<Metadata> = await this.storage.searchEmbeddings(embeddings, uniqueDocumentId);


            // 2. Prepare context
            console.log(`Preparing context for query: ${userQuestion}`);
            const contextChunks = RAGUtils.prepareContextFromVectorResults(
                results,
                this.relevanceThreshold
            );

            console.log(`Context prepared for query: ${userQuestion}`);
            if (contextChunks.length === 0) {
                return {
                    answer: "I couldn't find relevant information to answer your question.",
                    sources: [],
                    confidence: 0.0,
                    context_used: 0,
                    chunks_analyzed: [],
                    query: userQuestion,
                };
            }

            // 3. Generate LLM prompt
            console.log(`Generating LLM prompt for query: ${userQuestion}`);
            const prompt = RAGUtils.createRAGPrompt(userQuestion, contextChunks)

            // 4. Get LLM response
            console.log(`Getting LLM response for query: ${userQuestion}`);
            const response = await this.llmClient.chatWithContext(userQuestion, prompt);

            return {
                answer: response,
                sources: [],
                confidence: 0.0,
                context_used: contextChunks.length,
                chunks_analyzed: contextChunks,
                query: userQuestion
            };
        } catch (error) {
            console.error('RAG System Error:', error);
            throw new Error(`RAG system failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async createAgenticQuery(userQuery: string, uniqueDocumentId: string) {
        const systemPrompt = RAGUtils.getSystemPromptForInDocumentSearch(uniqueDocumentId);
        const response = await this.llmClientV2.chat(userQuery, systemPrompt);
        // console.log(response);
    }
};

export default RAGSystem
