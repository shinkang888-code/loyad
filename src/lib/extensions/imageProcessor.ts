/**
 * 이미지 처리 — ImageOptim / ImageMagick 패턴 (sharp)
 */

export type OptimizeOptions = {
  quality?: number;
  maxWidth?: number;
  format?: "jpeg" | "webp" | "png" | "avif";
};

async function loadSharp() {
  const mod = await import("sharp");
  return mod.default;
}

export async function optimizeImage(
  input: Buffer,
  options: OptimizeOptions = {}
): Promise<{ buffer: Buffer; mimeType: string; width: number; height: number }> {
  const quality = Math.min(Math.max(options.quality ?? 82, 40), 100);
  const maxWidth = options.maxWidth ?? 1920;
  const format = options.format ?? "webp";

  const sharp = await loadSharp();
  let pipeline = sharp(input).rotate().resize({
    width: maxWidth,
    withoutEnlargement: true,
  });

  switch (format) {
    case "jpeg":
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case "png":
      pipeline = pipeline.png({ compressionLevel: 9 });
      break;
    case "avif":
      pipeline = pipeline.avif({ quality });
      break;
    default:
      pipeline = pipeline.webp({ quality });
  }

  const buffer = await pipeline.toBuffer();
  const meta = await sharp(buffer).metadata();
  const mimeType =
    format === "jpeg"
      ? "image/jpeg"
      : format === "png"
        ? "image/png"
        : format === "avif"
          ? "image/avif"
          : "image/webp";

  return {
    buffer,
    mimeType,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
  };
}

export async function convertImage(
  input: Buffer,
  targetFormat: "jpeg" | "webp" | "png" | "avif",
  width?: number
): Promise<{ buffer: Buffer; mimeType: string }> {
  const result = await optimizeImage(input, {
    format: targetFormat,
    maxWidth: width ?? 4096,
    quality: 90,
  });
  return { buffer: result.buffer, mimeType: result.mimeType };
}
