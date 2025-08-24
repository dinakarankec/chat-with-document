import EmbeddingService from "../embeddings/EmbeddingService";
import { main } from "./OCRExtraction";
import type { DocumentChunk } from "./types";
import Storage from "../storage";
import type { Metadata, QueryResult } from "chromadb";
import RAGSystem from "../RAGSystem";

const args = process.argv.slice(2); // Remove 'bun' and 'script.js'



const embeddingService = new EmbeddingService();
const storage = new Storage();

const storeEmbeddings = async () => {
    const uniqueDocumentId = args[0] || "Acct_Statement_current_financial_year_from_hardcoded.pdf";
    const filePath = args[1];
    if (!filePath) {
        console.error('Please provide a PDF file path as an argument.');
        process.exit(1);
    }

    const chunks: DocumentChunk[] = await main(filePath, uniqueDocumentId);

    console.log(chunks);

    const embeddings = await embeddingService.generateEmbeddingsForChunks(chunks);

    await storage.storeEmbeddingsForDocument(uniqueDocumentId, embeddings, chunks);
    console.log('✅ Embeddings stored successfully');

}
// storeEmbeddings();

const searchEmbeddings = async () => {
    const uniqueDocumentId = args[0] || ''
    const query = args[1];
    console.log(uniqueDocumentId, query);
    if (!query) {
        console.error('Please provide a query as an argument.');
        process.exit(1);
    }
    const embeddings = await embeddingService.generateEmbeddings([query]);
    console.log(embeddings);
    const results: QueryResult<Metadata> = await storage.searchEmbeddings(embeddings, uniqueDocumentId);
    console.log(results);
}


const makeLLMCall = async () => {
    const uniqueDocumentId = args[0] || ''
    const query = args[1];
    if (!query) {
        console.error('Please provide a query as an argument.');
        process.exit(1);
    }
    const ragSystem = new RAGSystem();
    const response = await ragSystem.query(query, uniqueDocumentId);
    console.log(response);
}

const viewCollectionIds = async () => {
    await storage.viewCollectionIds();
}

const deleteAllCollection = async () => {
    await storage.deleteAllCollection();
}

const makeAgenticQuery = async () => {
    const uniqueDocumentId = args[0] || ''
    const query = args[1];
    if (!query) {
        console.error('Please provide a query as an argument.');
        process.exit(1);
    }
    const ragSystem = new RAGSystem();
    const response = await ragSystem.createAgenticQuery(query, uniqueDocumentId);
    // console.log(response);
}


// storeEmbeddings();
// searchEmbeddings();
// makeLLMCall();
// viewCollectionIds();
// deleteAllCollection();
makeAgenticQuery();




