import EmbeddingService from "../embeddings/EmbeddingService";
import { main } from "./OCRExtraction";
import type { DocumentChunk } from "./types";
import Storage from "../storage";

const args = process.argv.slice(2); // Remove 'bun' and 'script.js'

const filePath = args[0];

const embeddingService = new EmbeddingService();
const storage = new Storage();

const storeEmbeddings = async () => {
    if (!filePath) {
        console.error('Please provide a PDF file path as an argument.');
        process.exit(1);
    }

    const chunks: DocumentChunk[] = await main(filePath);

    const embeddings = await embeddingService.generateEmbeddingsForChunks(chunks);

    await storage.storeEmbeddings(embeddings, chunks);
    console.log('✅ Embeddings stored successfully');

}
// storeEmbeddings();

const searchEmbeddings = async () => {
    const query = args[0];
    if (!query) {
        console.error('Please provide a query as an argument.');
        process.exit(1);
    }
    const embeddings = await embeddingService.generateEmbeddings([query]);
    const results = await storage.searchEmbeddings(embeddings);
    console.log(results);
}

searchEmbeddings();
