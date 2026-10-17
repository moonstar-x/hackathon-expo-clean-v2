import { useState, type DragEvent, type ReactElement, type SyntheticEvent } from 'react';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useWatch } from 'react-hook-form';
import { DEFAULT_BRAND_COLOR } from '../constants/quoteDocuments';
import { brandingText } from '../i18n/quoteDocuments';
import {
  dropHintSx,
  previewBandSx,
  previewHeaderSx,
  previewLineSx,
  previewLogoSx,
  previewNumberSx,
  previewRowSx,
  previewSx,
  previewTableSx,
  previewTitleSx,
  previewTradeNameSx,
} from '../styles/branding';
import type { DocumentColors, HeaderPreviewProps } from '../types/quoteDocuments';
import { documentColors, isHexColor } from '../utils/documentColors';

/**
 * The top of a quote document as the PDF draws it, in miniature: the logo (or the trade name in its
 * place), the title and number, and the items table's first rows, in the colors the API derives from
 * the main color. It follows the form as the user types, before saving; while a code is half typed it
 * keeps the last whole color. A logo file dropped on it is uploaded like a picked one.
 */
const HeaderPreview = ({ logoUrl, loading, onFile, onLogoWidth }: HeaderPreviewProps): ReactElement => {
  const tradeName: unknown = useWatch({ name: 'tradeName' });
  const numberPrefix: unknown = useWatch({ name: 'numberPrefix' });
  const brandColor: unknown = useWatch({ name: 'brandColor' });
  const [shown, setShown] = useState<string>(isHexColor(brandColor) ? brandColor : DEFAULT_BRAND_COLOR);
  // Derived from the previous render, as React's docs show for state that follows a prop.
  if (isHexColor(brandColor) && brandColor !== shown) setShown(brandColor);
  const [dragging, setDragging] = useState<boolean>(false);
  const colors: DocumentColors = documentColors(shown);
  const name: string = typeof tradeName === 'string' && tradeName.trim() ? tradeName : brandingText.tradeNamePlaceholder;
  const prefix: string = typeof numberPrefix === 'string' && numberPrefix ? numberPrefix : 'COT';

  const drop = (event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
    setDragging(false);
    const file: File | undefined = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <Box
      component="figure"
      aria-label={brandingText.previewLabel}
      sx={previewSx(dragging)}
      onDragOver={(event: DragEvent<HTMLElement>): void => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event: DragEvent<HTMLElement>): void => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={drop}
    >
      <Box sx={previewHeaderSx}>
        {loading ? (
          <Skeleton variant="rounded" width={156} height={48} />
        ) : logoUrl ? (
          <Box
            component="img"
            src={logoUrl}
            alt="Logo de la empresa"
            sx={previewLogoSx}
            onLoad={(event: SyntheticEvent<HTMLImageElement>): void => onLogoWidth(event.currentTarget.naturalWidth)}
          />
        ) : (
          <Typography component="p" sx={previewTradeNameSx(colors.ink)}>
            {name}
          </Typography>
        )}
        <Box>
          <Typography component="p" sx={previewTitleSx(colors.ink)}>
            {brandingText.sampleTitle}
          </Typography>
          <Typography component="p" sx={previewNumberSx}>
            {brandingText.sampleNumber.replace('{prefijo}', prefix)}
          </Typography>
        </Box>
      </Box>
      <Box sx={previewTableSx} aria-hidden="true">
        <Box sx={previewBandSx(colors)}>
          <span>{brandingText.sampleDescription}</span>
          <span>{brandingText.sampleAmount}</span>
        </Box>
        <Box sx={previewRowSx('transparent')}>
          <Box sx={previewLineSx('46%')} />
          <Box sx={previewLineSx('14%')} />
        </Box>
        <Box sx={previewRowSx(colors.tint)}>
          <Box sx={previewLineSx('38%')} />
          <Box sx={previewLineSx('12%')} />
        </Box>
      </Box>
      {dragging ? <Box sx={dropHintSx}>{brandingText.dropLogo}</Box> : null}
    </Box>
  );
};

export default HeaderPreview;
