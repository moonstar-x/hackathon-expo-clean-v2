import type { MouseEvent, ReactElement } from 'react';
import Box from '@mui/material/Box';
import FileCopyOutlined from '@mui/icons-material/FileCopyOutlined';
import {
  Button,
  Labeled,
  TextField,
  useNotify,
  useRecordContext,
  useTranslate,
  type RaRecord,
  type TranslateFunction,
} from 'react-admin';
import type { CopyFieldWrapperProps } from '../types/components';
import { asText, valueAt } from '../utils/objects';

// A labeled field with a button that copies its value to the clipboard.
const CopyFieldWrapper = ({ source, label, field: Field = TextField }: CopyFieldWrapperProps): ReactElement | null => {
  const record: RaRecord | undefined = useRecordContext();
  const notify: ReturnType<typeof useNotify> = useNotify();
  const translate: TranslateFunction = useTranslate();
  const value: unknown = record ? valueAt(record, source) : undefined;
  if (value === undefined || value === null || value === '') return null;

  const copy = async (event: MouseEvent<HTMLButtonElement>): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(asText(value));
      notify('app.copy.copied', { messageArgs: { label: label ? translate(label) : source } });
    } catch {
      notify('app.copy.failed', { type: 'error' });
    }
  };

  return (
    <Labeled label={label}>
      <Box className="RaCopyFieldWrapper" sx={{ display: 'flex', alignItems: 'center' }}>
        <Field source={source} />
        <Button
          onClick={copy}
          aria-label={translate('app.copy.action', { label: label ? translate(label) : source })}
          sx={{ minWidth: 'auto', p: 0, ml: 1 }}
        >
          <FileCopyOutlined fontSize="small" />
        </Button>
      </Box>
    </Labeled>
  );
};

export default CopyFieldWrapper;
