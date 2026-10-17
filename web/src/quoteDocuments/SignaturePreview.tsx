import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import QrCode2 from '@mui/icons-material/QrCode2';
import { useWatch } from 'react-hook-form';
import { signatureText } from '../i18n/quoteDocuments';
import {
  handSignatureSx,
  signatureLineSx,
  signatureLinesSx,
  signaturePreviewSx,
  stampLabelSx,
  stampNameSx,
  stampQrSx,
  stampSx,
} from '../styles/signature';
import type { SignaturePreviewProps } from '../types/quoteDocuments';

const filled = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null);

/**
 * The company's signature box at the foot of a quote, in miniature: the electronic signature's stamp over
 * the line (a QR glyph; the PDF draws the real code, with who signed and when), then the representative's
 * name and title and the legal name, following the form as it is edited. Without a signature that signs,
 * the space to sign by hand, as the PDF leaves it.
 */
const SignaturePreview = ({ signerName, loading }: SignaturePreviewProps): ReactElement => {
  const representative: string | null = filled(useWatch({ name: 'signerName' }));
  const title: string | null = filled(useWatch({ name: 'signerTitle' }));
  const legalName: string | null = filled(useWatch({ name: 'legalName' }));
  // As the API's acceptance block: with a representative, their name and title, then the legal name.
  const lines: string[] = (representative ? [representative, title, legalName] : [legalName]).filter((line: string | null): line is string => line !== null);

  return (
    <Box component="figure" aria-label={signatureText.previewLabel} sx={signaturePreviewSx}>
      {loading ? (
        <Skeleton variant="rounded" width="60%" height={64} />
      ) : signerName ? (
        <Box sx={stampSx}>
          <QrCode2 aria-hidden="true" sx={stampQrSx} />
          <Box>
            <Typography component="p" sx={stampLabelSx}>
              {signatureText.signedBy}
            </Typography>
            <Typography component="p" sx={stampNameSx}>
              {signerName}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box sx={handSignatureSx}>{signatureText.signByHand}</Box>
      )}
      <Box sx={signatureLineSx} aria-hidden="true" />
      {lines.map(
        (line: string, index: number): ReactElement => (
          <Typography key={`${index}-${line}`} component="p" sx={signatureLinesSx}>
            {line}
          </Typography>
        ),
      )}
    </Box>
  );
};

export default SignaturePreview;
