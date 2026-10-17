import type { ReactElement } from 'react';
import Grid from '@mui/material/Grid';
import { Create, FileField, FileInput, required, SaveButton, SimpleForm, Toolbar, useTranslate, type TranslateFunction } from 'react-admin';
import CreateHeader from '../../components/CreateHeader';
import Section from '../../components/Section';
import { TDR_ACCEPT, TDR_MAX_BYTES } from '../../constants/tdr';
import { formPageSx } from '../../styles/pages';

/** Upload: one PDF or .docx. Saving queues its analysis and opens the entry, which shows the progress. */
const TdrCreate = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <Create redirect="edit" actions={<CreateHeader eyebrow="app.tdr.eyebrow" title="app.tdr.upload.title" />} sx={formPageSx}>
      <SimpleForm toolbar={<Toolbar><SaveButton label="app.tdr.upload.submit" /></Toolbar>}>
        <Section hint={translate('app.tdr.upload.hint')}>
          <Grid size={12}>
            <FileInput
              source="file"
              accept={TDR_ACCEPT}
              maxSize={TDR_MAX_BYTES}
              validate={required()}
              placeholder={translate('app.tdr.upload.placeholder')}
              helperText={false}
            >
              <FileField source="src" title="title" />
            </FileInput>
          </Grid>
        </Section>
      </SimpleForm>
    </Create>
  );
};

export default TdrCreate;
