import { useState, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import type { SvgIconComponent } from '@mui/icons-material';
import DataObjectOutlined from '@mui/icons-material/DataObjectOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import TableChartOutlined from '@mui/icons-material/TableChartOutlined';
import ViewInArOutlined from '@mui/icons-material/ViewInArOutlined';
import { useLogoutIfAccessDenied, useNotify, useTranslate, type TranslateFunction } from 'react-admin';
import { useAppConfig } from '../../../../AppConfigContext';
import { downloadMeasurementFile } from '../../../../providers/measurementFiles';
import { fileIconSx, fileRowSx } from '../../../../styles/measurements';
import type { MeasurementFileKind } from '../../../../types/api';
import type { FileRowProps } from '../../../../types/measurements';
import { formatFileSize } from '../../../../utils/format';

const FILE_ICONS: Record<MeasurementFileKind, SvgIconComponent> = {
  floorPlan: ImageOutlined,
  thumbnail: ImageOutlined,
  geometry: DataObjectOutlined,
  model: ViewInArOutlined,
  csv: TableChartOutlined,
  raw: DataObjectOutlined,
};

/**
 * One stored file: what it is, how big, and its download (SPEC-004 WEB-FILES-1). The button waits
 * for the file, which can take a while for a large model, and can't start a second download meanwhile.
 */
const FileRow = ({ measurementId, kind, file }: FileRowProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const notify: ReturnType<typeof useNotify> = useNotify();
  const logoutIfAccessDenied: ReturnType<typeof useLogoutIfAccessDenied> = useLogoutIfAccessDenied();
  const { apiUrl } = useAppConfig();
  const [downloading, setDownloading] = useState<boolean>(false);
  const Icon: SvgIconComponent = FILE_ICONS[kind];
  const name: string = translate(`app.measurements.files.kinds.${kind}`);

  const download = async (): Promise<void> => {
    setDownloading(true);
    try {
      await downloadMeasurementFile(apiUrl, measurementId, kind);
    } catch (error: unknown) {
      const signedOut: boolean = await logoutIfAccessDenied(error);
      if (!signedOut) {
        notify(error instanceof Error ? error.message : 'app.measurements.files.failed', { type: 'error' });
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Box component="li" sx={fileRowSx}>
      <Box aria-hidden sx={fileIconSx}>
        <Icon />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {name}
        </Typography>
        <Typography variant="caption" component="p" color="text.secondary">
          {formatFileSize(file.size)}
        </Typography>
        {kind === 'model' ? (
          <Typography variant="caption" component="p" color="text.secondary">
            {translate('app.measurements.files.modelHint')}
          </Typography>
        ) : null}
      </Box>
      <Button
        onClick={download}
        disabled={downloading}
        startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadOutlined />}
        aria-label={downloading ? undefined : translate('app.measurements.files.downloadLabel', { file: name })}
      >
        {translate(downloading ? 'app.measurements.files.downloading' : 'app.measurements.files.download')}
      </Button>
    </Box>
  );
};

export default FileRow;
