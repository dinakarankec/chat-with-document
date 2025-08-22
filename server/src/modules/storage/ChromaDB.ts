import { ChromaClient, QueryResult, type Collection, type Metadata } from "chromadb";
import type { DocumentChunk } from "../ocr/types";

class ChromaDB {
    collectionName: string;
    chromaClient: ChromaClient;
    collection: Collection | null = null;

    constructor(collectionName: string) {
        this.collectionName = collectionName;

        this.chromaClient = new ChromaClient({
            host: "localhost",
            port: 8244,
            ssl: false
        });
        this.initialize();
    }

    async getCollection(): Promise<Collection> {
        if (!this.collection) {
            this.collection = await this.instantiateCollection();
        }
        return this.collection;
    }

    instantiateCollection = async () => {
        this.collection = await this.chromaClient.getOrCreateCollection({
            name: this.collectionName,
            metadata: { description: 'PDF document embeddings' },
            embeddingFunction: null
        });
        return this.collection;
    }

    async initialize() {
        this.instantiateCollection();
    }

    async storeEmbeddings(embeddings: number[][], chunks: DocumentChunk[]) {
        const collection = await this.getCollection();
        await collection.add({
            ids: chunks.map(chunk => chunk.id),
            embeddings: embeddings,
            documents: chunks.map(chunk => chunk.content),
            metadatas: chunks.map(chunk => chunk.metadata)
        });
    }

    async searchEmbeddings(query: number[][]): Promise<QueryResult<Metadata>> {
        const collection = await this.getCollection();
        const results = await collection.query({
            queryEmbeddings: query,
            nResults: 5
        });
        return results;
    }
}

export default ChromaDB;