import { lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactElement } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import type { UseQueryResult } from '@tanstack/react-query';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import useGeometry from '../../../../hooks/useGeometry';
import { viewerLoadingSx } from '../../../../styles/measurements';
import type { Measurement } from '../../../../types/api';
import type { ScanGeometry } from '../../../../types/geometry';
import type { ModelViewerProps } from '../../../../types/measurements';
import { geometryErrorKey, roomLegend } from '../../../../utils/measurements';

// three.js is loaded with the viewer, in a bundle of its own, the first time someone opens this tab.
const ModelViewer: LazyExoticComponent<ComponentType<ModelViewerProps>> = lazy(() => import('./ModelViewer'));

/**
 * The 3D tab: the model, once its geometry has loaded and three.js with it. When the geometry can't
 * be read or is too new, this tab says so; the plan and the measurements still work (WEB-3D-4).
 */
const ModelTab = (): ReactElement | null => {
  const record: Measurement | undefined = useRecordContext<Measurement>();
  const translate: TranslateFunction = useTranslate();
  const { data: geometry, error }: UseQueryResult<ScanGeometry, Error> = useGeometry(record?.id);
  if (!record) return null;
  if (error) return <Alert severity="error">{translate(geometryErrorKey(error))}</Alert>;
  const loading: ReactElement = (
    <Box sx={viewerLoadingSx}>
      <CircularProgress aria-label={translate('app.measurements.model.loading')} />
    </Box>
  );
  if (!geometry) return loading;
  return (
    <Suspense fallback={loading}>
      <ModelViewer
        geometry={geometry}
        label={translate('app.measurements.model.label', { name: record.name })}
        legend={roomLegend(geometry, record.rooms)}
      />
    </Suspense>
  );
};

export default ModelTab;
