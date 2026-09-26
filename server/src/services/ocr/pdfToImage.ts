import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

/**
 * Convert PDF pages to image buffers using pdftoppm (poppler-utils)
 * Requires: poppler-utils (apt install poppler-utils / brew install poppler)
 * Windows: Install via conda or extract poppler binaries
 */
export async function pdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
  const workDir = join(tmpdir(), `medminders-pdf-${randomBytes(8).toString('hex')}`);
  mkdirSync(workDir, { recursive: true });

  const pdfPath = join(workDir, 'input.pdf');
  const { writeFile } = await import('fs/promises');
  await writeFile(pdfPath, pdfBuffer);

  try {
    const outPrefix = join(workDir, 'page');
    await execAsync(`pdftoppm -png -r 300 "${pdfPath}" "${outPrefix}"`, {
      maxBuffer: 50 * 1024 * 1024,
    });

    const images: Buffer[] = [];
    let page = 1;
    while (true) {
      const pngPath = `${outPrefix}-${String(page).padStart(6, '0')}.png`;
      if (!existsSync(pngPath)) break;
      images.push(readFileSync(pngPath));
      try {
        unlinkSync(pngPath);
      } catch {}
      page++;
    }

    if (images.length === 0) {
      throw new Error('PDF conversion produced no images. Ensure poppler-utils is installed.');
    }
    return images;
  } finally {
    try {
      unlinkSync(pdfPath);
    } catch {}
  }
}
