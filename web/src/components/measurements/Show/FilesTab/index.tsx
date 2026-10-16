import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import { useRecordContext } from 'react-admin';
import { fileListSx } from '../../../../styles/measurements';
import type { Measurement } from '../../../../types/api';
import type { StoredFile } from '../../../../types/measurements';
import { storedFiles } from '../../../../utils/measurements';
import FileRow from './FileRow';

/** The Archivos tab: every file the API stores for the measurement, plan first. */
const FilesTab = (): ReactElement | null => {
  const record: Measurement | undefined = useRecordContext<Measurement>();
  if (!record) return null;
  return (
    <Box component="ul" sx={fileListSx}>
      {storedFiles(record).map(
        ({ kind, file }: StoredFile): ReactElement => (
          <FileRow key={kind} measurementId={record.id} kind={kind} file={file} />
        ),
      )}
    </Box>
  );
};

export default FilesTab;
