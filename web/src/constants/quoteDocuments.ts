import { BRAND } from './brand';

// The quote document's palette. The API draws the PDF and the workbook with the same colors
// (api/src/modules/quoteDocuments/brand.ts), as the 3D view keeps the phone's scene colors.

/** The company's main color until it picks its own. */
export const DEFAULT_BRAND_COLOR: string = BRAND.indigo;

/** Body text of the document, and the dark choice for text on the main color. */
export const DOCUMENT_TEXT_COLOR: string = BRAND.navy;

/** The document's paper. */
export const DOCUMENT_PAPER_COLOR: string = BRAND.white;

/** Headings reach this contrast on the paper, darkened toward the text color when the main color is too light. */
export const DOCUMENT_INK_CONTRAST: number = 4.5;

/** Under this contrast with the paper a band of the main color hardly shows. */
export const BAND_MIN_CONTRAST: number = 1.3;

/** The image types the API takes as a logo. */
export const LOGO_TYPES: readonly string[] = ['image/png', 'image/jpeg'];

/** The API's limit on a logo, in bytes. */
export const LOGO_MAX_BYTES: number = 1024 * 1024;

/** Long sides tried, in order, when redrawing a logo until it weighs at most LOGO_MAX_BYTES. */
export const LOGO_SIDES: readonly number[] = [1200, 900, 600];

export const LOGO_JPEG_QUALITY: number = 0.92;

/** Narrower than this, a logo prints blurry at the width the PDF gives it. */
export const LOGO_MIN_SHARP_WIDTH: number = 300;

/** The logo is read at this size, in pixels a side, to find its colors. */
export const LOGO_SAMPLE_SIZE: number = 64;

/** At most this many colors are offered from the logo. */
export const LOGO_SUGGESTIONS: number = 5;

/** A color covering less of the logo than this is an edge or a detail, not a brand color. */
export const LOGO_MIN_COLOR_SHARE: number = 0.02;

/** Colors closer than this (RGB distance) are offered as one. */
export const LOGO_COLOR_MERGE_DISTANCE: number = 24;

/** The files the API takes as an electronic signature, by extension: browsers rarely know a .p12's type. */
export const SIGNATURE_EXTENSIONS: readonly string[] = ['.p12', '.pfx'];

/** The API's limit on a signature file, in bytes; real ones weigh a few KB. */
export const SIGNATURE_MAX_BYTES: number = 64 * 1024;

/** Closer than this to its expiry, a signature warns that it needs renewing. */
export const SIGNATURE_RENEWAL_DAYS: number = 30;

/** The settings each page saves (see DocumentSettingsEditProps.fields). */
export const COMPANY_FIELDS: readonly string[] = ['tradeName', 'legalName', 'taxId', 'address', 'city', 'phone', 'email', 'website', 'signerName', 'signerTitle', 'brandColor'];
export const TEMPLATE_FIELDS: readonly string[] = ['numberPrefix', 'validityDays', 'paperSize', 'paymentTerms', 'introText', 'termsText'];
