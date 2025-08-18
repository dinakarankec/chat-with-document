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

    async storeEmbeddings(embeddings: number[][], chunks: DocumentChunk[]) {
        if (!this.storage) {
            throw new Error('Storage not initialized');
        }
        await this.storage.storeEmbeddings(embeddings, chunks);
    }
}

export default Storage;
