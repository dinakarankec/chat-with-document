import { } from 'chromadb';
import * as fs from 'fs';
import * as path from 'path';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import * as Tesseract from 'tesseract.js';
import { createWorker } from 'tesseract.js';
import * as pdf2pic from 'pdf2pic';
import sharp from 'sharp';
import type { DocumentChunk, OCROptions } from './types';



class OCRExtraction {
    private ocrOptions: OCROptions;
    private tesseractWorker: Tesseract.Worker | null = null;

    constructor(
        ocrOptions: OCROptions = { engine: 'tesseract', languages: ['eng'] }
    ) {
        this.ocrOptions = ocrOptions;
    }

    async initialize(): Promise<void> {
        try {
            // Initialize Tesseract worker if using tesseract
            if (this.ocrOptions.engine === 'tesseract') {
                await this.initializeTesseract();
            }

            // Initialize Tesseract worker if using tesseract
            if (this.ocrOptions.engine === 'tesseract') {
                await this.initializeTesseract();
            }

            console.log(`✅ Enhanced PDF RAG system initialized`);
        } catch (error) {
            console.error('❌ Failed to initialize:', error);
            throw error;
        }
    }

    private async initializeTesseract(): Promise<void> {
        try {
            this.tesseractWorker = await createWorker(this.ocrOptions.languages || ['eng']);
            console.log('✅ Tesseract OCR worker initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Tesseract:', error);
            throw error;
        }
    }

    async convertPDFToImages(pdfPath: string): Promise<string[]> {
        try {
            const convert = pdf2pic.fromPath(pdfPath, {
                density: 300,           // High DPI for better OCR
                saveFilename: "page",
                savePath: "./temp_images",
                format: "png",
                width: 2000,
                height: 2000
            });

            // Create temp directory if it doesn't exist
            if (!fs.existsSync('./temp_images')) {
                fs.mkdirSync('./temp_images');
            }

            const results = await convert.bulk(-1); // Convert all pages

            const imagePaths = results.map((result: any) => result.path);
            console.log(`📸 Converted PDF to ${imagePaths.length} images`);

            return imagePaths;
        } catch (error) {
            console.error('❌ Failed to convert PDF to images:', error);
            throw error;
        }
    }

    async preprocessImage(imagePath: string): Promise<string> {
        try {
            const outputPath = imagePath.replace('.png', '_processed.png');

            await sharp(imagePath)
                .greyscale()                    // Convert to grayscale
                .normalize()                    // Normalize contrast
                .sharpen()                      // Sharpen image
                .threshold(128)                 // Convert to black and white
                .png()
                .toFile(outputPath);

            return outputPath;
        } catch (error) {
            console.error('❌ Failed to preprocess image:', error);
            return imagePath; // Return original if preprocessing fails
        }
    }

    async performOCR(imagePath: string): Promise<{ text: string; confidence: number }> {
        try {
            let processedImagePath = imagePath;

            // Preprocess image if enabled
            if (this.ocrOptions.preprocessImage) {
                processedImagePath = await this.preprocessImage(imagePath);
            }

            switch (this.ocrOptions.engine) {
                case 'tesseract':
                    return await this.tesseractOCR(processedImagePath);

                default:
                    throw new Error(`OCR engine ${this.ocrOptions.engine} not implemented`);
            }
        } catch (error) {
            console.error('❌ OCR failed:', error);
            return { text: '', confidence: 0 };
        }
    }

    private async tesseractOCR(imagePath: string): Promise<{ text: string; confidence: number }> {
        if (!this.tesseractWorker) {
            throw new Error('Tesseract worker not initialized');
        }

        try {
            const { data } = await this.tesseractWorker.recognize(imagePath);

            return {
                text: data.text.trim(),
                confidence: data.confidence
            };
        } catch (error) {
            console.error('❌ Tesseract OCR failed:', error);
            return { text: '', confidence: 0 };
        }
    }

    async extractTextFromPDF(pdfPath: string): Promise<Document[]> {
        try {
            console.log('📄 Extracting text from PDF...');

            // First, try standard PDF text extraction
            const loader = new PDFLoader(pdfPath, { splitPages: true });
            const textDocs = await loader.load();

            console.log(`📝 Extracted text from ${textDocs.length} pages`);

            // Convert PDF to images for OCR
            console.log('🖼️ Converting PDF to images for OCR...');
            const imagePaths = await this.convertPDFToImages(pdfPath);

            const enhancedDocs: Document[] = [];

            for (let i = 0; i < Math.max(textDocs.length, imagePaths.length); i++) {
                let combinedContent = '';
                let contentType: 'text' | 'ocr' | 'mixed' = 'text';
                let ocrConfidence = 0;

                // Get text content if available
                const textContent = textDocs[i]?.pageContent?.trim() || '';

                // Get OCR content
                let ocrContent = '';
                if (imagePaths[i]) {
                    console.log(`🔍 Running OCR on page ${i + 1}...`);
                    const ocrResult = await this.performOCR(imagePaths[i] as string);
                    ocrContent = ocrResult.text;
                    ocrConfidence = ocrResult.confidence;
                }

                // Combine text and OCR content
                if (textContent && ocrContent) {
                    // If both exist, prefer text but supplement with OCR if significantly different
                    combinedContent = textContent;
                    if (ocrContent.length > textContent.length * 1.2) {
                        combinedContent += '\n\n[OCR Additional Content]\n' + ocrContent;
                        contentType = 'mixed';
                    }
                } else if (textContent) {
                    combinedContent = textContent;
                    contentType = 'text';
                } else if (ocrContent) {
                    combinedContent = ocrContent;
                    contentType = 'ocr';
                }

                if (combinedContent.trim()) {
                    enhancedDocs.push(new Document({
                        pageContent: combinedContent,
                        metadata: {
                            source: pdfPath,
                            page: i + 1,
                            content_type: contentType,
                            ocr_confidence: ocrConfidence
                        }
                    }));
                }
            }

            // Cleanup temporary images
            this.cleanupTempImages();

            console.log(`✅ Total enhanced pages: ${enhancedDocs.length}`);
            return enhancedDocs;

        } catch (error) {
            console.error('❌ Failed to extract text from PDF:', error);
            this.cleanupTempImages();
            throw error;
        }
    }

    private cleanupTempImages(): void {
        try {
            if (fs.existsSync('./temp_images')) {
                const files = fs.readdirSync('./temp_images');
                files.forEach(file => {
                    fs.unlinkSync(path.join('./temp_images', file));
                });
                fs.rmdirSync('./temp_images');
                console.log('🧹 Cleaned up temporary images');
            }
        } catch (error) {
            console.warn('⚠️ Failed to cleanup temp images:', error);
        }
    }

    async chunkDocuments(documents: Document[]): Promise<DocumentChunk[]> {
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
            separators: ['\n\n', '\n', '. ', ' ', '']
        });

        const chunks: DocumentChunk[] = [];
        let globalChunkIndex = 0;

        for (const doc of documents) {
            const splitTexts = await textSplitter.splitText(doc.pageContent);

            for (const text of splitTexts) {
                chunks.push({
                    id: `chunk_${globalChunkIndex}`,
                    content: text.trim(),
                    metadata: {
                        source: doc.metadata.source || 'unknown',
                        page: doc.metadata.page || undefined,
                        chunk_index: globalChunkIndex,
                        content_type: doc.metadata.content_type || 'text',
                        ocr_confidence: doc.metadata.ocr_confidence
                    }
                });
                globalChunkIndex++;
            }
        }

        console.log(`📝 Created ${chunks.length} chunks`);
        return chunks;
    }

    async extractChunksFromPDF(pdfPath: string): Promise<DocumentChunk[]> {
        console.log(`🚀 Starting enhanced indexing of PDF: ${pdfPath}`);

        try {
            const documents = await this.extractTextFromPDF(pdfPath);
            const chunks = await this.chunkDocuments(documents);

            if (chunks.length === 0) {
                throw new Error('No content extracted from PDF');
            }

            // Generate embeddings in batches
            return chunks;

            //   await this.collection.add({
            //     ids: chunks.map(chunk => chunk.id),
            //     embeddings: embeddings,
            //     documents: chunks.map(chunk => chunk.content),
            //     metadatas: chunks.map(chunk => chunk.metadata)
            //   });

            console.log(`✅ Successfully indexed ${chunks.length} chunks with OCR enhancement`);

        } catch (error) {
            console.error('❌ Failed to index PDF:', error);
            throw error;
        }
    }



    async cleanup(): Promise<void> {
        if (this.tesseractWorker) {
            await this.tesseractWorker.terminate();
            console.log('🧹 Tesseract worker terminated');
        }
        this.cleanupTempImages();
    }
}

// Usage example
export async function main(filePath: string): Promise<DocumentChunk[]> {
    const ocrExtraction = new OCRExtraction(
        {
            engine: 'tesseract',
            languages: ['eng'],
            preprocessImage: true
        }
    );

    try {
        await ocrExtraction.initialize();

        const pdfPath = filePath;

        if (fs.existsSync(pdfPath)) {
            return await ocrExtraction.extractChunksFromPDF(pdfPath);
        }

        return [];
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await ocrExtraction.cleanup();
    }
    return [];
}
