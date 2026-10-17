import { Fragment, type ReactElement } from 'react';
import { Grid } from '@mui/material';
import { Edit, NumberInput, SelectInput, SimpleForm, TextInput, required } from 'react-admin';
import EditHeader from '../components/EditHeader';
import FormToolbar from '../components/FormToolbar';
import Section from '../components/Section';
import SectionDivider from '../components/SectionDivider';
import { documentFields, documentText } from '../i18n/quoteDocuments';
import { formPageSx } from '../styles/pages';

// Each section with its fields and their widths on the form's grid: codes and numbers 4, names 6, long text 12.
const groups: [string, [string, number][]][] = [
  [documentText.company, [['tradeName', 6], ['legalName', 6], ['taxId', 4], ['city', 4], ['phone', 4], ['address', 12], ['email', 6], ['website', 6]]],
  [documentText.signature, [['signerName', 6], ['signerTitle', 6]]],
  [documentText.numbering, [['numberPrefix', 4], ['validityDays', 4], ['paperSize', 4]]],
  [documentText.texts, [['paymentTerms', 12], ['introText', 12], ['termsText', 12]]],
];
function SettingInput({ source, multiline }: { source: string; multiline: boolean }): ReactElement {
  if (source === 'paperSize') return <SelectInput source={source} label={documentFields[source]} choices={[{ id: 'A4', name: 'A4' }, { id: 'LETTER', name: 'Carta' }]} validate={required()} fullWidth helperText={false} />;
  if (source === 'validityDays') return <NumberInput source={source} label={documentFields[source]} min={1} max={365} validate={required()} fullWidth helperText={false} />;
  return <TextInput source={source} label={source === 'paymentTerms' ? documentText.defaultPaymentTerms : documentFields[source]} fullWidth multiline={multiline} minRows={multiline ? 2 : undefined} validate={['tradeName', 'numberPrefix'].includes(source) ? required() : undefined} type={source === 'email' ? 'email' : 'text'} helperText={false} />;
}
/** The company and template on every quote document: one record; the toolbar says saving leaves past downloads as they were. */
export function DocumentSettings(): ReactElement {
  return <Edit resource="quote-document-settings" id={1} title={documentText.settings} mutationMode="pessimistic" redirect={false} actions={<EditHeader eyebrow="app.menu.quoting" title="app.menu.documentSettings" />} sx={formPageSx}>
    <SimpleForm toolbar={<FormToolbar note={documentText.settingsSaved} />}>
      {groups.map(([title, fields]: [string, [string, number][]], index: number): ReactElement => <Fragment key={title}>
        {index > 0 && <SectionDivider />}
        <Section title={title}>{fields.map(([source, width]: [string, number]): ReactElement => <Grid key={source} size={{ xs: 12, md: width }}><SettingInput source={source} multiline={title === documentText.texts} /></Grid>)}</Section>
      </Fragment>)}
    </SimpleForm>
  </Edit>;
}
