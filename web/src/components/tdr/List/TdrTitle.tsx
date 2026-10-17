import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useRecordContext } from 'react-admin';
import type { TdrDocument } from '../../../types/tdr';

/** The service the document names over its file name; only the file name until it is analyzed. */
const TdrTitle = (): ReactElement | null => {
  const doc: TdrDocument | undefined = useRecordContext<TdrDocument>();
  if (!doc) return null;
  return (
    <Box sx={{ minWidth: 0, maxWidth: 520 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {doc.title ?? doc.fileName}
      </Typography>
      {doc.title ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere' }}>
          {doc.fileName}
        </Typography>
      ) : null}
    </Box>
  );
};

export default TdrTitle;
