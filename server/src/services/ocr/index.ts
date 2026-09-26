import { OcrProvider } from './types.js';
import { GoogleVisionOcrProvider } from './googleVisionProvider.js';
import { MockOcrProvider } from './mockOcrProvider.js';
import { preprocessImage } from './imagePreprocessor.js';
import { pdfToImages } from './pdfToImage.js';

export * from './types.js';
export { preprocessImage } from './imagePreprocessor.js';
export { pdfToImages } from './pdfToImage.js';

let providerInstance: OcrProvider | null = null;

export function getOcrProvider(): OcrProvider {
  if (!providerInstance) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_KEY) {
      providerInstance = new GoogleVisionOcrProvider();
    } else if (process.env.NODE_ENV !== 'production') {
      providerInstance = new MockOcrProvider();
    } else {
      throw new Error('OCR provider not configured. Set GOOGLE_APPLICATION_CREDENTIALS.');
    }
  }
  return providerInstance;
}

export function setOcrProvider(provider: OcrProvider): void {
  providerInstance = provider;
}

/**
 * Main OCR entry: handles image/PDF, pre-processing, multi-pass for handwritten
 */
export async function performOcr(
  buffer: Buffer,
  contentType: string,
  options?: { preprocess?: boolean; multiPassHandwritten?: boolean }
): Promise<{ text: string; confidence: number }> {
  const provider = getOcrProvider();
  const preprocess = options?.preprocess ?? true;

  if (contentType === 'application/pdf') {
    const pages = await pdfToImages(buffer);
    const result = await provider.scanPdf(pages);
    return { text: result.text, confidence: result.confidence };
  }

  // Image
  const toScan = preprocess ? await preprocessImage(buffer) : buffer;
  let result = await provider.scanImage(toScan);

  if (options?.multiPassHandwritten && result.confidence < 0.85) {
    const originalResult = await provider.scanImage(buffer);
    if (originalResult.confidence > result.confidence || originalResult.text.length > result.text.length) {
      result = originalResult;
    }
  }

  return { text: result.text, confidence: result.confidence };
}
