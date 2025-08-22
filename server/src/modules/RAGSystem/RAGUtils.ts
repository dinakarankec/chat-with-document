import type { Metadata, QueryResult } from "chromadb";
import type { DocumentChunk } from "../ocr/types";
import type { ContextChunk } from "./type";

class RAGUtils {
    static prepareContextFromVectorResults(
        vectorResults: QueryResult<Metadata>,
        relevanceThreshold: number = 1.5
    ): ContextChunk[] {
        const documents: string[] = vectorResults.documents[0] ? vectorResults.documents[0].filter((doc) => doc !== null) || [] as string[] : []
        const distances: number[] = vectorResults.distances[0] ? vectorResults.distances[0].filter((dist) => dist !== null) || [] as number[] : []
        const metadata: DocumentChunk['metadata'][] = (vectorResults.metadatas[0] ? vectorResults.metadatas[0].filter((meta) => meta !== null) || [] : []) as any[]

        const contextChunks: ContextChunk[] = [];

        for (let i = 0; i < documents.length; i++) {
            const distance = distances[i];

            if (distance && distance <= relevanceThreshold) {
                contextChunks.push({
                    content: documents[i] as any,
                    relevance_score: Math.max(0, 1 - distance) as any, // Convert to 0-1 scale
                    source: metadata[i]?.source || '',
                    page: metadata[i]?.page || 0,
                    chunk_index: metadata[i]?.chunk_index || i,
                    distance: distance
                });
            }
        }

        // Sort by relevance (highest first)
        return contextChunks.sort((a, b) => b.relevance_score - a.relevance_score);
    }

    static createRAGPrompt(userQuery: string, contextChunks: ContextChunk[]): string {


        console.log(`Creating RAG prompt for user query ${userQuery}`)
        let contextText = '';

        contextChunks.forEach((chunk, index) => {
            contextText += `--- Context ${index + 1} (Relevance: ${chunk.relevance_score.toFixed(2)}) ---\n`;
            contextText += `${chunk.content}\n\n`;
        });

        return `You are an AI assistant that answers questions based on provided context from documents.
    
    **User Query:** ${userQuery}
    
    **Relevant Context:**
    ${contextText}
    
    **Instructions:**
    1. Answer the user's question using ONLY the information provided in the given context, you don't have to mention anything about the context source in your answer
    2. If the context doesn't contain enough information to answer the question, clearly state this
    3. Cite which context section(s) you're using for your answer
    4. Be specific and accurate - don't make assumptions beyond what's in the context
    5. If you find conflicting information in different context sections, mention this
    6. If its about Financial query respond amount details in INR
    7. You don't have to mention anything about the context source in your answer
    **Answer:`;
    }
}

export default RAGUtils;