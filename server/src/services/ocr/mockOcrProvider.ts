import { OcrProvider, OcrResult } from './types.js';

/**
 * Mock OCR provider for development when Google Vision is not configured
 * Returns sample prescription text
 */
export class MockOcrProvider implements OcrProvider {
  async scanImage(_buffer?: Buffer): Promise<OcrResult> {
    return {
      text: `Rx
Ciprofloxacin 500mg
1+0+1 x 5 days

Metformin 850mg
1-0-0

Paracetamol 500mg
SOS`,
      confidence: 0.85,
      blocks: [],
    };
  }

  async scanPdf(pagesBuffers: Buffer[]): Promise<OcrResult> {
    return this.scanImage(pagesBuffers[0] ?? Buffer.from(''));
  }
}
