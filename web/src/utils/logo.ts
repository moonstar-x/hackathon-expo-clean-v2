import { LOGO_JPEG_QUALITY, LOGO_MAX_BYTES, LOGO_SAMPLE_SIZE, LOGO_SIDES, LOGO_TYPES } from '../constants/quoteDocuments';
import { brandingText } from '../i18n/quoteDocuments';

const canvasBlob = (canvas: HTMLCanvasElement, type: string): Promise<Blob | null> =>
  new Promise((resolve: (blob: Blob | null) => void): void => canvas.toBlob(resolve, type, LOGO_JPEG_QUALITY));

const context2d = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const context: CanvasRenderingContext2D | null = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error(brandingText.logoUnsupported);
  return context;
};

const openImage = async (image: Blob, options?: ImageBitmapOptions): Promise<ImageBitmap> => {
  if (typeof createImageBitmap !== 'function') throw new Error(brandingText.logoUnsupported);
  try {
    return await createImageBitmap(image, options);
  } catch (error: unknown) {
    throw new Error(brandingText.logoUnreadable, { cause: error });
  }
};

/**
 * The picked file as a logo the API takes. Every image is redrawn through a canvas, which turns it
 * upright (EXIF orientation), drops its metadata and gives the 8-bit RGB(A) PNG or plain RGB JPEG the
 * API checks for, of the same type, at most 1200 px on its long side, and smaller until it weighs at
 * most 1 MB. Errors say what to do, in Spanish.
 */
export const fitLogo = async (file: File): Promise<Blob> => {
  if (!LOGO_TYPES.includes(file.type)) throw new Error(brandingText.logoType);
  const bitmap: ImageBitmap = await openImage(file, { imageOrientation: 'from-image' });
  try {
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    const context: CanvasRenderingContext2D = context2d(canvas);
    const longSide: number = Math.max(bitmap.width, bitmap.height);
    // A logo already small enough is drawn once at its own size; a larger one steps down until it fits.
    const sides: number[] = LOGO_SIDES.filter((side: number, index: number): boolean => index === 0 || side < longSide);
    for (const side of sides) {
      const scale: number = Math.min(1, side / longSide);
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob: Blob | null = await canvasBlob(canvas, file.type);
      if (!blob) throw new Error(brandingText.logoUnsupported);
      if (blob.size <= LOGO_MAX_BYTES) return blob;
    }
    throw new Error(brandingText.logoTooLarge);
  } finally {
    bitmap.close();
  }
};

/** The logo's RGBA pixels at a small square size, enough to tell which colors it is made of. */
export const readLogoPixels = async (logo: Blob): Promise<Uint8ClampedArray> => {
  const bitmap: ImageBitmap = await openImage(logo, { resizeWidth: LOGO_SAMPLE_SIZE, resizeHeight: LOGO_SAMPLE_SIZE });
  try {
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = LOGO_SAMPLE_SIZE;
    canvas.height = LOGO_SAMPLE_SIZE;
    const context: CanvasRenderingContext2D = context2d(canvas);
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, LOGO_SAMPLE_SIZE, LOGO_SAMPLE_SIZE).data;
  } finally {
    bitmap.close();
  }
};
