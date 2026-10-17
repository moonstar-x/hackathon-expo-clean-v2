import { useRef, useState, type ChangeEvent, type ReactElement, type RefObject } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { useNotify } from 'react-admin';
import ConfirmButton from '../components/ConfirmButton';
import Section from '../components/Section';
import { REQUEST_FAILED_MESSAGE } from '../constants/http';
import { LOGO_MIN_SHARP_WIDTH, LOGO_TYPES } from '../constants/quoteDocuments';
import useCompanyLogo from '../hooks/useCompanyLogo';
import useLogoColors from '../hooks/useLogoColors';
import useObjectUrl from '../hooks/useObjectUrl';
import { brandingText } from '../i18n/quoteDocuments';
import { brandingNoteSx, brandingWarningSx, controlActionsSx, controlTitleSx } from '../styles/branding';
import type { CompanyLogo } from '../types/quoteDocuments';
import { fitLogo } from '../utils/logo';
import ColorInput from './ColorInput';
import HeaderPreview from './HeaderPreview';

/**
 * "Logo y colores", last on the Empresa page: the quote's header in miniature beside the controls
 * that change it. The logo is saved as soon as it is picked or dropped (redrawn to what the API takes
 * first) and removed after a confirmation; the main color is a form field, saved with Guardar, and the
 * preview shows it as it changes.
 */
const BrandingSection = (): ReactElement => {
  const notify: ReturnType<typeof useNotify> = useNotify();
  const { logo, upload, remove }: CompanyLogo = useCompanyLogo();
  const logoUrl: string | undefined = useObjectUrl(logo.data ?? undefined);
  const suggestions: string[] = useLogoColors(logo.data);
  const [measured, setMeasured] = useState<{ url: string; width: number } | undefined>(undefined);
  const picker: RefObject<HTMLInputElement | null> = useRef<HTMLInputElement>(null);
  const busy: boolean = upload.isPending || remove.isPending;
  const hasLogo: boolean = Boolean(logo.data);
  const blurry: boolean = measured !== undefined && measured.url === logoUrl && measured.width < LOGO_MIN_SHARP_WIDTH;

  const saveLogo = async (file: File): Promise<void> => {
    if (busy) return;
    try {
      await upload.mutateAsync(await fitLogo(file));
      notify(brandingText.logoSaved, { type: 'success' });
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : REQUEST_FAILED_MESSAGE, { type: 'error' });
    }
  };

  const removeLogo = async (): Promise<void> => {
    await remove.mutateAsync();
    notify(brandingText.logoRemoved, { type: 'success' });
  };

  const note: ReactElement | null = logo.isError ? (
    <Typography sx={brandingWarningSx}>{brandingText.logoLoadFailed}</Typography>
  ) : !logo.isPending && !hasLogo ? (
    <Typography sx={brandingNoteSx}>{brandingText.noLogo}</Typography>
  ) : blurry ? (
    <Typography sx={brandingWarningSx}>{brandingText.smallLogo}</Typography>
  ) : null;

  return (
    <Section title={brandingText.section} hint={brandingText.hint}>
      <Grid size={{ xs: 12, md: 7 }}>
        <HeaderPreview
          logoUrl={logo.isError ? undefined : logoUrl}
          loading={logo.isPending}
          onFile={(file: File): void => void saveLogo(file)}
          onLogoWidth={(width: number): void => setMeasured(logoUrl ? { url: logoUrl, width } : undefined)}
        />
        {note}
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Stack spacing={3}>
          <Box>
            <Typography component="h3" sx={controlTitleSx}>
              {brandingText.logo}
            </Typography>
            <Box sx={controlActionsSx}>
              <Button
                variant="outlined"
                startIcon={upload.isPending ? <CircularProgress size={16} color="inherit" /> : <UploadFileOutlined />}
                disabled={busy}
                onClick={(): void => picker.current?.click()}
              >
                {hasLogo ? brandingText.changeLogo : brandingText.uploadLogo}
              </Button>
              {hasLogo ? (
                <ConfirmButton
                  label={brandingText.removeLogo}
                  color="error"
                  disabled={busy}
                  confirmTitle={brandingText.removeLogo}
                  confirmContent={brandingText.removeLogoConfirm}
                  onConfirm={removeLogo}
                >
                  <DeleteOutline />
                </ConfirmButton>
              ) : null}
              <input
                ref={picker}
                type="file"
                accept={LOGO_TYPES.join(',')}
                hidden
                onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                  const file: File | undefined = event.target.files?.[0];
                  // Cleared, so picking the same file again (after an error) still counts as a change.
                  event.target.value = '';
                  if (file) void saveLogo(file);
                }}
              />
            </Box>
            <Typography sx={brandingNoteSx}>{brandingText.logoRequirements}</Typography>
          </Box>
          <ColorInput suggestions={suggestions} />
        </Stack>
      </Grid>
    </Section>
  );
};

export default BrandingSection;
