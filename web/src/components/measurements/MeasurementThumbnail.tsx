import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import type { SvgIconComponent } from '@mui/icons-material';
import BrokenImageOutlined from '@mui/icons-material/BrokenImageOutlined';
import ViewInArOutlined from '@mui/icons-material/ViewInArOutlined';
import type { UseQueryResult } from '@tanstack/react-query';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import { THUMBNAIL_SIZE } from '../../constants/measurements';
import useMeasurementFile from '../../hooks/useMeasurementFile';
import useObjectUrl from '../../hooks/useObjectUrl';
import { thumbnailPlaceholderSx, thumbnailSx } from '../../styles/measurements';
import type { Measurement } from '../../types/api';

/**
 * The phone's small picture of the plan, on white like the plan itself, or a muted tile when the
 * measurement has none (SPEC-004 §6.4). The picture is decorative: the name always sits beside it.
 */
const MeasurementThumbnail = (): ReactElement | null => {
  const record: Measurement | undefined = useRecordContext<Measurement>();
  const translate: TranslateFunction = useTranslate();
  const hasThumbnail: boolean = Boolean(record?.files.thumbnail);
  const { data, isError }: UseQueryResult<Blob, Error> = useMeasurementFile(record?.id, 'thumbnail', hasThumbnail);
  const url: string | undefined = useObjectUrl(data);
  if (!record) return null;
  if (!hasThumbnail || isError) {
    const Icon: SvgIconComponent = isError ? BrokenImageOutlined : ViewInArOutlined;
    return (
      <Box
        role="img"
        aria-label={translate(isError ? 'app.measurements.thumbnail.failed' : 'app.measurements.thumbnail.missing')}
        sx={thumbnailPlaceholderSx}
      >
        <Icon fontSize="small" />
      </Box>
    );
  }
  if (!url) return <Skeleton variant="rounded" width={THUMBNAIL_SIZE} height={THUMBNAIL_SIZE} sx={{ borderRadius: '8px' }} />;
  return <Box component="img" src={url} alt="" sx={thumbnailSx} />;
};

export default MeasurementThumbnail;
