import { OcrProvider, OcrResult, OcrTextBlock } from './types.js';
import { ImageAnnotatorClient } from '@google-cloud/vision';

/**
 * Google Cloud Vision API implementation of OcrProvider
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env or keyFilename
 */
export class GoogleVisionOcrProvider implements OcrProvider {
  private client: ImageAnnotatorClient;

  constructor() {
    this.client = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }

  async scanImage(buffer: Buffer): Promise<OcrResult> {
    const [result] = await this.client.textDetection({
      image: { content: buffer },
      imageContext: { languageHints: ['en', 'bn'] },
    });

    const fullText = result.fullTextAnnotation?.text ?? '';
    const pages = result.fullTextAnnotation?.pages ?? [];
    const blocks: OcrTextBlock[] = [];

    for (const page of pages) {
      for (const block of page.blocks ?? []) {
        let blockText = '';
        for (const paragraph of block.paragraphs ?? []) {
          for (const word of paragraph.words ?? []) {
            blockText += (word.symbols ?? []).map(s => s.text ?? '').join('');
          }
          blockText += '\n';
        }
        const conf = block.confidence ?? 0;
        blocks.push({ text: blockText.trim(), confidence: conf });
      }
    }

    const confidence = result.fullTextAnnotation?.pages?.[0]?.confidence ?? 0.9;

    return { text: fullText, confidence, blocks };
  }

  async scanPdf(pagesBuffers: Buffer[]): Promise<OcrResult> {
    const texts: string[] = [];
    let totalConf = 0;

    for (const pageBuf of pagesBuffers) {
      const result = await this.scanImage(pageBuf);
      texts.push(result.text);
      totalConf += result.confidence;
    }

    const mergedText = texts.join('\n\n');
    const avgConf = pagesBuffers.length > 0 ? totalConf / pagesBuffers.length : 0.9;

    return { text: mergedText, confidence: avgConf, blocks: [] };
  }
}
