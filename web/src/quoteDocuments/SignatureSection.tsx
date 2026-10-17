import { useState, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { useNotify } from 'react-admin';
import ConfirmButton from '../components/ConfirmButton';
import Section from '../components/Section';
import { SIGNATURE_RENEWAL_DAYS } from '../constants/quoteDocuments';
import useCompanySignature from '../hooks/useCompanySignature';
import useNow from '../hooks/useNow';
import { signatureText } from '../i18n/quoteDocuments';
import { brandingNoteSx, brandingWarningSx, controlActionsSx, controlTitleSx } from '../styles/branding';
import { detailLabelSx, detailsSx, detailValueSx } from '../styles/signature';
import type { CompanySignature, SignatureInfo } from '../types/quoteDocuments';
import { formatDate } from '../utils/dates';
import SignatureDialog from './SignatureDialog';
import SignaturePreview from './SignaturePreview';

const DAY_MS: number = 24 * 60 * 60 * 1000;

/**
 * "Firma electrónica", on the Empresa page: the company's optional .p12, which signs every quote PDF and
 * stamps its QR in the company's signature box. The box in miniature beside who the certificate is for,
 * who issued it and until when it signs; loading one (in a dialog, with its password) or removing it
 * saves at once, like the logo. A signature that expired or can't be used is said, never hidden.
 */
const SignatureSection = (): ReactElement => {
  const notify: ReturnType<typeof useNotify> = useNotify();
  const { signature, upload, remove }: CompanySignature = useCompanySignature();
  const [loading, setLoading] = useState<boolean>(false);
  const now: Date = useNow(false);
  const info: SignatureInfo | null | undefined = signature.data;
  const busy: boolean = upload.isPending || remove.isPending;
  const renewSoon: boolean = info?.status === 'valid' && new Date(info.validTo).getTime() - now.getTime() < SIGNATURE_RENEWAL_DAYS * DAY_MS;
  const details: [string, string][] = info
    ? ([[signatureText.holder, info.signerName], [signatureText.issuer, info.issuerName], [signatureText.validUntil, formatDate(info.validTo)]] as [string, string][]).filter(
        ([, value]: [string, string]): boolean => value !== '',
      )
    : [];

  const removeSignature = async (): Promise<void> => {
    await remove.mutateAsync();
    notify(signatureText.removed, { type: 'success' });
  };

  const note: ReactElement | null = signature.isError ? (
    <Typography sx={brandingWarningSx}>{signatureText.loadFailed}</Typography>
  ) : !signature.isPending && !info ? (
    <Typography sx={brandingNoteSx}>{signatureText.none}</Typography>
  ) : info?.status === 'expired' ? (
    <Typography sx={brandingWarningSx}>{signatureText.expired}</Typography>
  ) : info?.status === 'unavailable' ? (
    <Typography sx={brandingWarningSx}>{signatureText.unavailable}</Typography>
  ) : renewSoon ? (
    <Typography sx={brandingWarningSx}>{signatureText.renew}</Typography>
  ) : null;

  return (
    <Section title={signatureText.section} hint={signatureText.hint}>
      <Grid size={{ xs: 12, md: 7 }}>
        <SignaturePreview signerName={info?.status === 'valid' ? info.signerName : undefined} loading={signature.isPending} />
        {note}
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Typography component="h3" sx={controlTitleSx}>
          {signatureText.file}
        </Typography>
        {details.length ? (
          <Box component="dl" sx={detailsSx}>
            {details.map(
              ([label, value]: [string, string]): ReactElement => (
                <Box key={label}>
                  <Typography component="dt" sx={detailLabelSx}>
                    {label}
                  </Typography>
                  <Typography component="dd" sx={detailValueSx}>
                    {value}
                  </Typography>
                </Box>
              ),
            )}
          </Box>
        ) : null}
        <Box sx={controlActionsSx}>
          <Button variant="outlined" startIcon={<UploadFileOutlined />} disabled={busy} onClick={(): void => setLoading(true)}>
            {info ? signatureText.change : signatureText.load}
          </Button>
          {info ? (
            <ConfirmButton
              label={signatureText.remove}
              color="error"
              disabled={busy}
              confirmTitle={signatureText.remove}
              confirmContent={signatureText.removeConfirm}
              onConfirm={removeSignature}
            >
              <DeleteOutline />
            </ConfirmButton>
          ) : null}
        </Box>
        <Typography sx={brandingNoteSx}>{signatureText.requirements}</Typography>
        <SignatureDialog open={loading} onClose={(): void => setLoading(false)} upload={upload} />
      </Grid>
    </Section>
  );
};

export default SignatureSection;
