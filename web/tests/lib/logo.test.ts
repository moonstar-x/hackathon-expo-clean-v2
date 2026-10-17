// @vitest-environment jsdom
// jsdom for its canvas element; drawing and encoding, which jsdom lacks, are stubbed.
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { fitLogo } from '../../src/utils/logo';

const MB: number = 1024 * 1024;
let encodedSizes: number[];
let drawImage: Mock<(image: unknown, x: number, y: number, width: number, height: number) => void>;
let toBlob: Mock<(callback: BlobCallback, type?: string, quality?: number) => void>;

/** The browser opens the picked image as a bitmap of this size. */
const opens = (width: number, height: number): Mock => {
  const open: Mock = vi.fn((): Promise<{ width: number; height: number; close: () => void }> => Promise.resolve({ width, height, close: vi.fn() }));
  vi.stubGlobal('createImageBitmap', open);
  return open;
};
const file = (type: string): File => new File(['picked'], 'logo', { type });
/** Width and height of each redraw, in order. */
const redraws = (): [number, number][] => drawImage.mock.calls.map((call: unknown[]): [number, number] => [call[3] as number, call[4] as number]);

beforeEach((): void => {
  encodedSizes = [];
  drawImage = vi.fn();
  toBlob = vi.fn((callback: BlobCallback, type?: string): void => callback(new Blob([new Uint8Array(encodedSizes.shift() ?? 1000)], { type })));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ clearRect: vi.fn(), drawImage } as unknown as CanvasRenderingContext2D);
  HTMLCanvasElement.prototype.toBlob = toBlob;
});

describe('fitting a logo for the API', (): void => {
  it('redraws every logo upright, at most 1200 px on its long side, as the same type', async (): Promise<void> => {
    const open: Mock = opens(3000, 1000);
    const fitted: Blob = await fitLogo(file('image/png'));
    expect(open).toHaveBeenCalledWith(expect.any(File), { imageOrientation: 'from-image' });
    expect(redraws()).toEqual([[1200, 400]]);
    expect(fitted.type).toBe('image/png');
  });

  it('redraws a small logo at its own size, so its metadata is gone too', async (): Promise<void> => {
    opens(400, 200);
    await fitLogo(file('image/jpeg'));
    expect(redraws()).toEqual([[400, 200]]);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.92);
  });

  it('steps down to 900 and 600 px until it weighs at most 1 MB', async (): Promise<void> => {
    opens(3000, 1500);
    encodedSizes = [2 * MB, 1.5 * MB, 0.5 * MB];
    const fitted: Blob = await fitLogo(file('image/png'));
    expect(redraws()).toEqual([[1200, 600], [900, 450], [600, 300]]);
    expect(fitted.size).toBe(0.5 * MB);
  });

  it('refuses a logo still over 1 MB at 600 px', async (): Promise<void> => {
    opens(3000, 3000);
    encodedSizes = [3 * MB, 2 * MB, 1.5 * MB];
    await expect(fitLogo(file('image/png'))).rejects.toThrow('El logo debe pesar como máximo 1 MB.');
  });

  it('refuses other types and unreadable images, and says when the browser can’t help', async (): Promise<void> => {
    opens(100, 100);
    await expect(fitLogo(file('image/gif'))).rejects.toThrow('El logo debe ser una imagen PNG o JPG.');
    vi.stubGlobal('createImageBitmap', vi.fn((): Promise<never> => Promise.reject(new Error('decode'))));
    await expect(fitLogo(file('image/png'))).rejects.toThrow('No se pudo leer la imagen. Prueba con otro PNG o JPG.');
    vi.stubGlobal('createImageBitmap', undefined);
    await expect(fitLogo(file('image/png'))).rejects.toThrow('Este navegador no puede preparar el logo. Prueba con otro navegador.');
  });
});
