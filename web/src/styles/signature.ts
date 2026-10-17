// Styles of the Empresa page's "Firma electrónica" section: the company's signature box in miniature, on
// the document's white paper in both themes (as the header's in styles/branding.ts), with the signature's
// details and buttons beside it, and the dialog that loads a .p12.
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import { DOCUMENT_TEXT_COLOR } from '../constants/quoteDocuments';

export const signaturePreviewSx: SxProps<Theme> = {
  m: 0,
  p: { xs: 2, sm: 3 },
  bgcolor: 'common.white',
  color: DOCUMENT_TEXT_COLOR,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '14px',
};

/** The stamp: the QR beside who signed, as the PDF draws it over the company's line. */
export const stampSx: SxProps<Theme> = { display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 64 };

export const stampQrSx: SxProps<Theme> = { flexShrink: 0, fontSize: 64, color: DOCUMENT_TEXT_COLOR };

export const stampLabelSx: SxProps<Theme> = { m: 0, fontSize: 11, lineHeight: 1.4, color: alpha(DOCUMENT_TEXT_COLOR, 0.72) };

export const stampNameSx: SxProps<Theme> = { m: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.3, overflowWrap: 'anywhere' };

/** Without an electronic signature, the space to sign by hand: as tall as the stamp, so nothing moves when one is loaded. */
export const handSignatureSx: SxProps<Theme> = {
  display: 'grid',
  placeItems: 'center',
  width: { xs: '100%', sm: '60%' },
  minHeight: 64,
  border: '1px dashed',
  borderColor: alpha(DOCUMENT_TEXT_COLOR, 0.24),
  borderRadius: '8px',
  fontSize: 12,
  color: alpha(DOCUMENT_TEXT_COLOR, 0.56),
};

export const signatureLineSx: SxProps<Theme> = { width: { xs: '100%', sm: '60%' }, my: 1, borderTop: '1px solid', borderColor: alpha(DOCUMENT_TEXT_COLOR, 0.5) };

/** The representative's name and title, then the legal name, as the PDF prints them under the line. */
export const signatureLinesSx: SxProps<Theme> = { m: 0, fontSize: 12, lineHeight: 1.6 };

/** The certificate's details, label over value as the app's figures read. */
export const detailsSx: SxProps<Theme> = { display: 'grid', gap: 1, m: 0, mt: 1 };

export const detailLabelSx: SxProps<Theme> = { m: 0, fontSize: 13, fontWeight: 500, color: 'text.secondary' };

export const detailValueSx: SxProps<Theme> = { m: 0, fontSize: 14, color: 'text.primary', overflowWrap: 'anywhere' };

/** The dialog's file button with the chosen file's name beside it. */
export const filePickerSx: SxProps<Theme> = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mt: 1 };

export const fileNameSx: SxProps<Theme> = { m: 0, minWidth: 0, fontSize: 14, color: 'text.secondary', overflowWrap: 'anywhere' };
