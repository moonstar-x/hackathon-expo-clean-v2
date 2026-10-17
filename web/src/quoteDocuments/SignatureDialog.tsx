import { useRef, useState, type ChangeEvent, type FormEvent, type ReactElement, type RefObject } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { HttpError, useNotify } from 'react-admin';
import { REQUEST_FAILED_MESSAGE } from '../constants/http';
import { SIGNATURE_EXTENSIONS, SIGNATURE_MAX_BYTES } from '../constants/quoteDocuments';
import { translateApiMessage } from '../i18n/apiErrors';
import { signatureText } from '../i18n/quoteDocuments';
import { detailLabelSx, fileNameSx, filePickerSx } from '../styles/signature';
import type { ApiErrorBody } from '../types/api';
import type { SignatureDialogProps, SignatureFieldErrors as FieldErrors } from '../types/quoteDocuments';

const fileError = (file: File): string | undefined => {
  if (!SIGNATURE_EXTENSIONS.some((extension: string): boolean => file.name.toLowerCase().endsWith(extension))) return signatureText.fileType;
  return file.size > SIGNATURE_MAX_BYTES ? signatureText.fileTooLarge : undefined;
};

/**
 * Loads the company's .p12 with its password, which the API checks together: a wrong password, an
 * expired certificate or another kind of file is said under the field to fix. The dialog keeps its own
 * state, so the password never reaches the settings form behind it, and it forgets both on closing.
 */
const SignatureDialog = ({ open, onClose, upload }: SignatureDialogProps): ReactElement => {
  const notify: ReturnType<typeof useNotify> = useNotify();
  const picker: RefObject<HTMLInputElement | null> = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | undefined>(undefined);
  const [password, setPassword] = useState<string>('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const close = (): void => {
    setFile(undefined);
    setPassword('');
    setErrors({});
    onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    // The dialog renders in a portal, but React still bubbles its submit to the settings form around it.
    event.stopPropagation();
    const missing: FieldErrors = { file: file ? fileError(file) : signatureText.fileRequired, password: password ? undefined : signatureText.passwordRequired };
    if (missing.file || missing.password || !file) {
      setErrors(missing);
      return;
    }
    try {
      await upload.mutateAsync({ file, password });
      notify(signatureText.saved, { type: 'success' });
      close();
    } catch (error: unknown) {
      const fields: Record<string, unknown> | undefined = error instanceof HttpError ? (error.body as ApiErrorBody | undefined)?.errors : undefined;
      if (fields?.file || fields?.password) {
        setErrors({ file: fields.file ? translateApiMessage(fields.file) : undefined, password: fields.password ? translateApiMessage(fields.password) : undefined });
        return;
      }
      notify(error instanceof Error ? error.message : REQUEST_FAILED_MESSAGE, { type: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={upload.isPending ? undefined : close} fullWidth maxWidth="xs" aria-labelledby="signature-dialog-title">
      <Box component="form" noValidate onSubmit={submit}>
        <DialogTitle id="signature-dialog-title">{signatureText.dialogTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5}>
            <Box>
              <Typography id="signature-file-label" sx={detailLabelSx}>
                {signatureText.file}
              </Typography>
              <Box sx={filePickerSx}>
                <Button
                  variant="outlined"
                  startIcon={<UploadFileOutlined />}
                  disabled={upload.isPending}
                  aria-describedby="signature-file-label"
                  onClick={(): void => picker.current?.click()}
                >
                  {signatureText.chooseFile}
                </Button>
                <Typography sx={fileNameSx}>{file?.name ?? signatureText.noFile}</Typography>
              </Box>
              <input
                ref={picker}
                type="file"
                accept={[...SIGNATURE_EXTENSIONS, 'application/x-pkcs12'].join(',')}
                hidden
                onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                  const picked: File | undefined = event.target.files?.[0];
                  // Cleared, so picking the same file again (after an error) still counts as a change.
                  event.target.value = '';
                  if (!picked) return;
                  setFile(picked);
                  setErrors({ ...errors, file: fileError(picked) });
                }}
              />
              {errors.file ? <FormHelperText error>{errors.file}</FormHelperText> : null}
            </Box>
            <TextField
              type="password"
              label={signatureText.password}
              value={password}
              onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                setPassword(event.target.value);
                setErrors({ ...errors, password: undefined });
              }}
              error={Boolean(errors.password)}
              helperText={errors.password ?? ' '}
              disabled={upload.isPending}
              autoComplete="off"
              fullWidth
              slotProps={{ htmlInput: { maxLength: 256, spellCheck: false } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={upload.isPending}>
            {signatureText.cancel}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={upload.isPending}
            startIcon={upload.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {signatureText.load}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default SignatureDialog;
