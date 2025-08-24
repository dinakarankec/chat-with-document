import { pipeline } from "@xenova/transformers";
import type { DocumentChunk } from "../ocr/types";

class EmbeddingService {
    private extractor: any = null;

    async initialize() {
        if (!this.extractor) {
            this.extractor = await pipeline(
                'feature-extraction',
                'Xenova/all-mpnet-base-v2'
            );
        }
    }

    async generateEmbeddings(texts: string[]): Promise<number[][]> {
        try {
            await this.initialize();

            const embeddings = await this.extractor(texts, {
                pooling: 'mean',
                normalize: true
            });

            // Handle single text vs array of texts
            if (texts.length === 1) {
                return [Array.from(embeddings.data)];
            }

            // Convert to array of arrays
            const embeddingSize = embeddings.data.length / texts.length;
            const result: number[][] = [];

            for (let i = 0; i < texts.length; i++) {
                const start = i * embeddingSize;
                const end = start + embeddingSize;
                result.push(Array.from(embeddings.data.slice(start, end)));
            }

            return result;
        } catch (error) {
            console.error('❌ Failed to generate embeddings:', error);
            throw error;
        }
    }

    async generateEmbeddingsForChunks(chunks: DocumentChunk[]): Promise<number[][]> {

        const batchSize = 10;
        const embeddings: number[][] = [];
        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);
            const batchTexts = batch.map(chunk => chunk.content);

            console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);

            const batchEmbeddings = await this.generateEmbeddings(batchTexts);
            embeddings.push(...batchEmbeddings);

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return embeddings;
    }
}

export default EmbeddingService;