import { DOCUMENT_INK_CONTRAST, DOCUMENT_PAPER_COLOR, DOCUMENT_TEXT_COLOR } from '../constants/quoteDocuments';
import type { DocumentColors } from '../types/quoteDocuments';

// The quote document's colors from the company's main color, derived exactly as the API derives them
// (api/src/modules/quoteDocuments/colors.ts), so the Empresa page previews what the PDF prints.

const HEX_COLOR: RegExp = /^#[0-9A-F]{6}$/;

/** A color as the API stores it: "#" and six upper-case hex digits. */
export const isHexColor = (value: unknown): value is string => typeof value === 'string' && HEX_COLOR.test(value);

/** What a typed color becomes: trimmed, upper case, with its "#". */
export const normalizeHex = (value: string): string => {
  const typed: string = value.trim().toUpperCase();
  return typed && !typed.startsWith('#') ? `#${typed}` : typed;
};

const channels = (hex: string): number[] => [1, 3, 5].map((i: number): number => parseInt(hex.slice(i, i + 2), 16));

const toHex = (rgb: number[]): string =>
  `#${rgb.map((v: number): string => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/** WCAG relative luminance. */
const luminance = (hex: string): number => {
  const [r, g, b]: number[] = channels(hex).map((v: number): number => {
    const c: number = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio between two colors, from 1 to 21. */
export const contrast = (a: string, b: string): number => {
  const [light, dark]: number[] = [luminance(a), luminance(b)].sort((x: number, y: number): number => y - x);
  return (light + 0.05) / (dark + 0.05);
};

/** `from` moved toward `to` by `t` (0 to 1), channel by channel. */
const mix = (from: string, to: string, t: number): string => {
  const target: number[] = channels(to);
  return toHex(channels(from).map((v: number, i: number): number => Math.round(v + (target[i] - v) * t)));
};

/**
 * The document's colors: the main color fills the bands, with white or the text color on it,
 * whichever reads better; headings use it too, darkened toward the text color in tenths until they
 * read on white; alternate rows get a tenth of it over the paper.
 */
export const documentColors = (brandColor: string): DocumentColors => {
  const accent: string = brandColor.toUpperCase();
  const onAccent: string =
    contrast(DOCUMENT_PAPER_COLOR, accent) >= contrast(DOCUMENT_TEXT_COLOR, accent) ? DOCUMENT_PAPER_COLOR : DOCUMENT_TEXT_COLOR;
  let ink: string = accent;
  for (let step: number = 1; step <= 10 && contrast(ink, DOCUMENT_PAPER_COLOR) < DOCUMENT_INK_CONTRAST; step++) {
    ink = mix(accent, DOCUMENT_TEXT_COLOR, step / 10);
  }
  return { accent, onAccent, ink, tint: mix(DOCUMENT_PAPER_COLOR, accent, 0.1) };
};
