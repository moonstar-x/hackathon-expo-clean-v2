import { Fragment, type ReactElement } from 'react';
import { Grid } from '@mui/material';
import { Edit, NumberInput, SelectInput, SimpleForm, TextInput, required, type RaRecord } from 'react-admin';
import EditHeader from '../components/EditHeader';
import FormToolbar from '../components/FormToolbar';
import Section from '../components/Section';
import SectionDivider from '../components/SectionDivider';
import { documentFields, documentText } from '../i18n/quoteDocuments';
import { formPageSx } from '../styles/pages';
import type { DocumentSettingsEditProps, SettingGroup } from '../types/quoteDocuments';

function SettingInput({ source, multiline }: { source: string; multiline: boolean }): ReactElement {
  if (source === 'paperSize') return <SelectInput source={source} label={documentFields[source]} choices={[{ id: 'A4', name: 'A4' }, { id: 'LETTER', name: 'Carta' }]} validate={required()} fullWidth helperText={false} />;
  if (source === 'validityDays') return <NumberInput source={source} label={documentFields[source]} min={1} max={365} validate={required()} fullWidth helperText={false} />;
  return <TextInput source={source} label={source === 'paymentTerms' ? documentText.defaultPaymentTerms : documentFields[source]} fullWidth multiline={multiline} minRows={multiline ? 2 : undefined} validate={['tradeName', 'numberPrefix'].includes(source) ? required() : undefined} type={source === 'email' ? 'email' : 'text'} helperText={false} />;
}

/** The fields this page edits, out of the whole record the form holds. */
const pick = (data: RaRecord, fields: readonly string[]): Partial<RaRecord> =>
  Object.fromEntries(fields.filter((field: string): boolean => Object.hasOwn(data, field)).map((field: string): [string, unknown] => [field, data[field]]));

/**
 * The quote documents' settings, one record (id 1) edited from two pages under Administración,
 * Empresa and Plantilla. Each saves only its own fields: the API merges a partial PUT, so saving one
 * page never puts back an older copy of the other's. An API error keeps the user on the page
 * (`redirectOnError`); there is no list to go back to. The toolbar says past downloads don't change.
 */
const DocumentSettingsEdit = ({ title, groups, fields, children }: DocumentSettingsEditProps): ReactElement => (
  <Edit
    resource="quote-document-settings"
    id={1}
    title={title}
    mutationMode="pessimistic"
    redirect={false}
    redirectOnError={false}
    transform={(data: RaRecord): Partial<RaRecord> => pick(data, fields)}
    actions={<EditHeader eyebrow="app.menu.administration" title={title} />}
    sx={formPageSx}
  >
    <SimpleForm toolbar={<FormToolbar note={documentText.settingsSaved} />}>
      {groups.map(({ title: groupTitle, hint, fields: inputs }: SettingGroup, index: number): ReactElement => (
        <Fragment key={groupTitle}>
          {index > 0 ? <SectionDivider /> : null}
          {/* Codes and numbers 4 columns wide, names 6, long text 12. */}
          <Section title={groupTitle} hint={hint}>
            {inputs.map(([source, width]: [string, number]): ReactElement => (
              <Grid key={source} size={{ xs: 12, md: width }}>
                <SettingInput source={source} multiline={groupTitle === documentText.texts} />
              </Grid>
            ))}
          </Section>
        </Fragment>
      ))}
      {children ? (
        <>
          <SectionDivider />
          {children}
        </>
      ) : null}
    </SimpleForm>
  </Edit>
);

export default DocumentSettingsEdit;
