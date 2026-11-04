import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

function ensureDir() {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Local file storage. Replace with S3/Firebase/Cloud Storage in production.
 */
export function saveFile(buffer: Buffer, ext: string): { relativeUrl: string; absolutePath: string } {
  ensureDir();
  const name = `${randomUUID()}.${ext}`;
  const absolutePath = join(UPLOAD_DIR, name);
  writeFileSync(absolutePath, buffer);
  return { relativeUrl: `/uploads/${name}`, absolutePath };
}

export function getFileUrl(relativePath: string): string {
  const base = process.env.API_BASE_URL || 'http://localhost:4000';
  return relativePath.startsWith('http') ? relativePath : `${base}${relativePath}`;
}

export function getAbsolutePath(fileUrl: string): string {
  const match = fileUrl.match(/\/uploads\/([^/?#]+)$/);
  const name = match ? match[1] : fileUrl.replace(/^.*\//, '');
  return join(UPLOAD_DIR, name);
}

export function readFileFromStorage(fileUrl: string): Buffer {
  return readFileSync(getAbsolutePath(fileUrl));
}
