import type { ReactElement } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { Edit, NumberInput, SelectInput, SimpleForm, Toolbar, SaveButton, TextInput, required, useNotify } from 'react-admin';
import { documentFields, documentText } from '../i18n/quoteDocuments';

const groups: [string, string[]][] = [
  ['Empresa', ['tradeName', 'legalName', 'taxId', 'address', 'city', 'phone', 'email', 'website']], ['Firma', ['signerName', 'signerTitle']], ['Numeración y validez', ['numberPrefix', 'validityDays', 'paperSize']], ['Textos', ['paymentTerms', 'introText', 'termsText']],
];
export function DocumentSettings(): ReactElement {
  const notify: ReturnType<typeof useNotify> = useNotify();
  return <Edit resource="quote-document-settings" id={1} title={documentText.settings} mutationMode="pessimistic" redirect={false} mutationOptions={{ onSuccess: (): void => { notify(documentText.settingsSaved, { type: 'success' }); } }}><SimpleForm toolbar={<Toolbar><SaveButton /></Toolbar>}>
    <Box sx={{ width: '100%' }}>{groups.map(([title, fields]: [string, string[]]): ReactElement => <Card variant="outlined" sx={{ mb: 2 }} key={title}><CardContent><Typography variant="h6">{title}</Typography><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: title === 'Textos' ? '1fr' : '1fr 1fr' }, gap: 2 }}>{fields.map((source: string): ReactElement => source === 'paperSize' ? <SelectInput key={source} source={source} label={documentFields[source]} choices={[{ id: 'A4', name: 'A4' }, { id: 'LETTER', name: 'Carta' }]} validate={required()} /> : source === 'validityDays' ? <NumberInput key={source} source={source} label={documentFields[source]} min={1} max={365} validate={required()} /> : <TextInput key={source} source={source} label={source === 'paymentTerms' ? 'Forma de pago predeterminada' : documentFields[source]} fullWidth multiline={title === 'Textos'} validate={['tradeName', 'numberPrefix'].includes(source) ? required() : undefined} type={source === 'email' ? 'email' : 'text'} />)}</Box></CardContent></Card>)}</Box>
  </SimpleForm></Edit>;
}
