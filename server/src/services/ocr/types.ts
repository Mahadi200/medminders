/**
 * OCR Provider Interface
 * Pluggable - default implementation uses Google Cloud Vision API
 */
export interface OcrTextBlock {
  text: string;
  confidence?: number;
  bounds?: { x: number; y: number; width: number; height: number }[];
}

export interface OcrResult {
  text: string;
  confidence: number;
  blocks?: OcrTextBlock[];
}

export interface OcrProvider {
  scanImage(buffer: Buffer): Promise<OcrResult>;
  scanPdf(pagesBuffers: Buffer[]): Promise<OcrResult>;
}
