import { LOGO_COLOR_MERGE_DISTANCE, LOGO_MIN_COLOR_SHARE, LOGO_SUGGESTIONS } from '../constants/quoteDocuments';

interface ColorCount { r: number; g: number; b: number; count: number }

const distance = (a: ColorCount, b: ColorCount): number => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

const toHex = ({ r, g, b }: ColorCount): string =>
  `#${[r, g, b].map((v: number): string => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/**
 * The colors a logo is mostly made of, most used first, to offer as the company's main color. From
 * RGBA pixels (a canvas's ImageData): transparent and near-white pixels are background; the rest go in
 * buckets of 5 bits a channel, each bucket's average joins a larger one within a short distance, and a
 * color under 2% of the logo is an edge or a detail, so it is left out.
 */
export const logoColors = (pixels: ArrayLike<number>, max: number = LOGO_SUGGESTIONS): string[] => {
  const buckets: Map<number, ColorCount> = new Map<number, ColorCount>();
  let counted: number = 0;
  for (let i: number = 0; i + 3 < pixels.length; i += 4) {
    const r: number = pixels[i], g: number = pixels[i + 1], b: number = pixels[i + 2];
    if (pixels[i + 3] < 128 || (r > 235 && g > 235 && b > 235)) continue;
    const key: number = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bucket: ColorCount = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
    bucket.r += r; bucket.g += g; bucket.b += b; bucket.count += 1;
    buckets.set(key, bucket);
    counted += 1;
  }
  const ranked: ColorCount[] = [...buckets.values()]
    .map(({ r, g, b, count }: ColorCount): ColorCount => ({ r: r / count, g: g / count, b: b / count, count }))
    .sort((x: ColorCount, y: ColorCount): number => y.count - x.count);
  const merged: ColorCount[] = [];
  for (const color of ranked) {
    const near: ColorCount | undefined = merged.find((kept: ColorCount): boolean => distance(kept, color) <= LOGO_COLOR_MERGE_DISTANCE);
    if (near) near.count += color.count;
    else merged.push({ ...color });
  }
  return merged
    .filter((color: ColorCount): boolean => color.count >= counted * LOGO_MIN_COLOR_SHARE)
    .sort((x: ColorCount, y: ColorCount): number => y.count - x.count)
    .slice(0, max)
    .map(toHex);
};
