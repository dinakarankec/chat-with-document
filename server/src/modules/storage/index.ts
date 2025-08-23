import type { Metadata, QueryResult } from "chromadb";
import type { DocumentChunk } from "../ocr/types";
import ChromaDB from "./ChromaDB";

type StorageType = 'ChromaDB';

class Storage {
    private storageType: StorageType;
    private storage: ChromaDB | null = null;
    constructor() {
        this.storageType = 'ChromaDB';
        this.initialize();
    }

    private initialize() {
        switch (this.storageType) {
            case 'ChromaDB':
                this.storage = new ChromaDB('pdf-chunks');
                break;
        }
    }

    async storeEmbeddingsForDocument(uniqueDocumentId: string, embeddings: number[][], chunks: DocumentChunk[]) {
        if (!this.storage) {
            throw new Error('Storage not initialized');
        }
        await this.storage.storeEmbeddingsForDocument(uniqueDocumentId, embeddings, chunks);
    }

    async searchEmbeddings(query: number[][], uniqueDocumentId: string): Promise<QueryResult<Metadata>> {
        if (!this.storage) {
            throw new Error('Storage not initialized');
        }
        return await this.storage.searchEmbeddings(query, uniqueDocumentId);
    }

    async viewCollectionIds() {
        if (!this.storage) {
            throw new Error('Storage not initialized');
        }
        await this.storage.viewCollectionIds();
    }

    async deleteAllCollection() {
        if (!this.storage) {
            throw new Error('Storage not initialized');
        }
        await this.storage.deleteAllCollection();
    }
}

export default Storage;
