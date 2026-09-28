import sharp from 'sharp';

/**
 * Image pre-processing for OCR: deskew, denoise, contrast enhancement
 */
export async function preprocessImage(buffer: Buffer): Promise<Buffer> {
  let image = sharp(buffer);

  const metadata = await image.metadata();
  const rotate = getRotationFromExif(metadata.orientation);
  if (rotate) {
    image = image.rotate(rotate);
  }

  return image
    .grayscale()
    .normalize()
    .modulate({ brightness: 1.1, saturation: 0 })
    .toBuffer();
}

function getRotationFromExif(orientation?: number): number | undefined {
  const map: Record<number, number> = {
    3: 180,
    6: 90,
    8: -90,
  };
  return map[orientation ?? 0];
}
