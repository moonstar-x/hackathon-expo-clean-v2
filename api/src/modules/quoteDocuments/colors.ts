import { brand } from './brand.ts';

export interface DocumentColors { accent: string; onAccent: string; ink: string; tint: string }
const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hex = (c: number[]) => `#${c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const luminance = (h: string) => { const [r, g, b] = rgb(h).map(v => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (from: string, to: string, t: number) => { const target = rgb(to); return hex(rgb(from).map((v, i) => Math.round(v + (target[i] - v) * t))); };
/** The company's color as the document uses it: bands filled with it, white or navy text on them, headings darkened toward navy until they read on white (4.5:1), and a 10% tint for rows. The web's preview mirrors this. */
export function documentColors(brandColor: string): DocumentColors {
  const accent = brandColor.toUpperCase(), onAccent = contrast(brand.white, accent) >= contrast(brand.navy, accent) ? brand.white : brand.navy;
  let ink = accent;
  for (let step = 1; step <= 10 && contrast(ink, brand.white) < 4.5; step++) ink = mix(accent, brand.navy, step / 10);
  return { accent, onAccent, ink, tint: mix(brand.white, accent, 0.1) };
}
