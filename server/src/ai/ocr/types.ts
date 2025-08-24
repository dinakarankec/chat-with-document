// Alternative OCR options
export interface OCROptions {
    engine: 'tesseract' | 'paddle-ocr' | 'easyocr';
    languages?: string[];
    preprocessImage?: boolean;
}

export interface DocumentChunk {
    id: string;
    content: string;
    metadata: {
        source: string;
        page?: number;
        chunk_index: number;
        content_type: 'text' | 'ocr' | 'mixed';
        ocr_confidence?: number;
        uniqueDocumentId: string;
    };
}

export interface QueryResult {
    content: string;
    metadata: any;
    distance?: number;

}