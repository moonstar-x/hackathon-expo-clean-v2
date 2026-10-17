import type { ReactElement, ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import {
  ArrayInput,
  Link,
  maxLength,
  minValue,
  maxValue,
  NumberInput,
  number,
  ReferenceInput,
  required,
  SelectInput,
  SimpleFormIterator,
  TabbedForm,
  TextInput,
  useRecordContext,
  useTranslate,
  type TranslateFunction,
  type Validator,
} from 'react-admin';
import { INSTALLATION_TYPES, RISKS } from '../../../constants/tdr';
import type { TdrDocument } from '../../../types/tdr';
import { emptyToNull } from '../../../utils/validators';
import FormToolbar from '../../FormToolbar';
import ResponsiveTabbedFormTabs from '../../ResponsiveTabbedFormTabs';
import Section from '../../Section';
import CreateQuoteButton from './CreateQuoteButton';

/** A grid cell: half the row from `md` unless told otherwise. */
const Cell = ({ children, size = 6 }: { children: ReactNode; size?: number }): ReactElement => (
  <Grid size={{ xs: 12, md: size }}>{children}</Grid>
);
const label = (field: string): string => `app.tdr.fields.${field}`;

// The API's limits (SPEC-009 §4.1), checked here first so a refusal never surprises.
const text = (source: string, max: number, props: Record<string, unknown> = {}): ReactElement => (
  <TextInput source={source} label={label(source.split('.').pop()!)} validate={maxLength(max)} parse={emptyToNull} fullWidth {...props} />
);
const amount = (source: string, props: Record<string, unknown> = {}): ReactElement => (
  <NumberInput source={source} label={label(source.split('.').pop()!)} min={0} validate={[number(), minValue(0)]} fullWidth {...props} />
);
const integer = (source: string, max: number): ReactElement => (
  <NumberInput source={source} label={label(source)} min={0} step={1} validate={[number(), minValue(0), maxValue(max)]} fullWidth />
);
const validateRequired = (max: number): Validator[] => [required(), maxLength(max)];

/** The form's enum choices in Spanish, with an empty one for "the document doesn't say". */
const useChoices = (values: string[]): { id: string; name: string }[] => {
  const translate: TranslateFunction = useTranslate();
  return values.map((id: string): { id: string; name: string } => ({ id, name: translate(`app.tdr.enums.${id}`) }));
};

/** Save, Guardar y crear cotización, or Ver cotización once the document has one. */
const Actions = (): ReactElement | null => {
  const doc: TdrDocument | undefined = useRecordContext<TdrDocument>();
  const translate: TranslateFunction = useTranslate();
  if (!doc) return null;
  return doc.quoteId === null ? (
    <CreateQuoteButton />
  ) : (
    <Button component={Link} to={`/quotes/${doc.quoteId}/show`} variant="outlined" startIcon={<RequestQuoteIcon />}>
      {translate('app.tdr.actions.viewQuote')}
    </Button>
  );
};

/**
 * What the AI extracted from a TDR document, to review and correct before quoting (SPEC-009 §6), in
 * tabs, since a hospital's document gives dozens of zones and supplies.
 */
const TdrForm = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const installationTypes: { id: string; name: string }[] = useChoices(INSTALLATION_TYPES);
  const risks: { id: string; name: string }[] = useChoices(RISKS);
  return (
    <TabbedForm tabs={<ResponsiveTabbedFormTabs />} toolbar={<FormToolbar withDelete actions={<Actions />} />}>
      <TabbedForm.Tab label="app.tdr.tabs.general">
        <Alert severity="info" sx={{ width: '100%' }}>{translate('app.tdr.review')}</Alert>
        <Section title={translate('app.tdr.sections.service')}>
          <Cell size={12}>{text('extraction.title', 150)}</Cell>
          <Cell size={12}>{text('extraction.summary', 3000, { multiline: true, minRows: 3 })}</Cell>
          <Cell size={4}>
            <SelectInput source="extraction.installationType" label={label('installationType')} choices={installationTypes} translateChoice={false} emptyText="" parse={emptyToNull} fullWidth />
          </Cell>
          <Cell size={4}>{text('extraction.city', 100)}</Cell>
          <Cell size={4}>{amount('extraction.totalArea')}</Cell>
          <Cell size={12}>{text('extraction.serviceHours', 300)}</Cell>
        </Section>
        <Section title={translate('app.tdr.sections.commercial')}>
          <Cell size={4}>{amount('extraction.referencePrice', { helperText: 'app.tdr.hints.referencePrice' })}</Cell>
          <Cell size={4}>
            <NumberInput source="extraction.contractMonths" label={label('contractMonths')} min={1} step={1} validate={[number(), minValue(1), maxValue(120)]} fullWidth />
          </Cell>
          <Cell size={12}>{text('extraction.paymentTerms', 500, { multiline: true })}</Cell>
        </Section>
      </TabbedForm.Tab>

      <TabbedForm.Tab label="app.tdr.tabs.client" path="client">
        <Section title={translate('app.tdr.sections.client')} hint={translate('app.tdr.hints.client')}>
          <Cell size={8}>{text('extraction.client.legalName', 150)}</Cell>
          <Cell size={4}>{text('extraction.client.taxId', 20)}</Cell>
          <Cell>{text('extraction.client.contactName', 100)}</Cell>
          <Cell>{text('extraction.client.contactTitle', 100)}</Cell>
          <Cell>{text('extraction.client.email', 254)}</Cell>
          <Cell>{text('extraction.client.phone', 30)}</Cell>
          <Cell size={12}>{text('extraction.client.address', 200)}</Cell>
        </Section>
      </TabbedForm.Tab>

      <TabbedForm.Tab label="app.tdr.tabs.zones" path="zones">
        <Alert severity="info" sx={{ width: '100%' }}>{translate('app.tdr.hints.zones')}</Alert>
        <ArrayInput source="extraction.zones" label={false}>
          <SimpleFormIterator disableReordering={false} getItemLabel={(index: number): string => `${translate(label('zone'))} ${index + 1}`}>
            <Section>
              <Cell size={8}><TextInput source="name" label={label('name')} validate={validateRequired(100)} fullWidth /></Cell>
              <Cell size={4}><SelectInput source="risk" label={label('risk')} choices={risks} translateChoice={false} emptyText="" parse={emptyToNull} fullWidth /></Cell>
              <Cell>
                <ReferenceInput source="zoneTypeId" reference="quote-zone-types" perPage={1000} filter={{ active: true }}>
                  <SelectInput label={label('zoneTypeId')} helperText="app.tdr.hints.zoneType" emptyText="" parse={emptyToNull} fullWidth />
                </ReferenceInput>
              </Cell>
              <Cell>
                <ReferenceInput source="scheduleId" reference="quote-schedules" perPage={1000} filter={{ active: true }}>
                  <SelectInput label={label('scheduleId')} emptyText="" parse={emptyToNull} fullWidth />
                </ReferenceInput>
              </Cell>
              <Cell size={3}>{amount('floorArea')}</Cell>
              <Cell size={3}>{integer('fixedPosts', 1000)}</Cell>
              <Cell size={3}>
                <NumberInput source="hoursPerDay" label={label('hoursPerDay')} min={0} max={24} validate={[number(), minValue(0.01), maxValue(24)]} fullWidth />
              </Cell>
              <Cell size={3}>
                <NumberInput source="daysPerMonth" label={label('daysPerMonth')} min={0} max={31} validate={[number(), minValue(0.01), maxValue(31)]} fullWidth />
              </Cell>
              <Cell size={12}>{text('notes', 1000, { multiline: true })}</Cell>
            </Section>
          </SimpleFormIterator>
        </ArrayInput>
      </TabbedForm.Tab>

      <TabbedForm.Tab label="app.tdr.tabs.staff" path="staff">
        <Section title={translate('app.tdr.sections.staff')}>
          <Grid size={12}>
            <ArrayInput source="extraction.staff" label={false}>
              <SimpleFormIterator inline>
                <TextInput source="role" label={label('role')} validate={validateRequired(100)} />
                <NumberInput source="count" label={label('count')} min={0} step={1} validate={[number(), minValue(0)]} />
                <TextInput source="notes" label={label('notes')} validate={maxLength(300)} parse={emptyToNull} sx={{ minWidth: { md: 360 } }} />
              </SimpleFormIterator>
            </ArrayInput>
          </Grid>
        </Section>
        <Section title={translate('app.tdr.sections.equipment')}>
          <Grid size={12}>
            <ArrayInput source="extraction.equipment" label={false}>
              <SimpleFormIterator inline>
                <TextInput source="description" label={label('description')} validate={validateRequired(300)} sx={{ minWidth: { md: 360 } }} />
                <NumberInput source="quantity" label={label('quantity')} min={0} validate={[number(), minValue(0)]} />
                <TextInput source="notes" label={label('notes')} validate={maxLength(300)} parse={emptyToNull} />
              </SimpleFormIterator>
            </ArrayInput>
          </Grid>
        </Section>
      </TabbedForm.Tab>

      <TabbedForm.Tab label="app.tdr.tabs.supplies" path="supplies">
        <Section hint={translate('app.tdr.hints.supplies')}>
          <Grid size={12}>
            <ArrayInput source="extraction.supplies" label={false}>
              <SimpleFormIterator inline>
                <TextInput source="description" label={label('description')} validate={validateRequired(500)} multiline sx={{ minWidth: { md: 420 } }} />
                <TextInput source="presentation" label={label('presentation')} validate={maxLength(100)} parse={emptyToNull} />
                <NumberInput source="quantity" label={label('quantity')} min={0} validate={[number(), minValue(0)]} />
                <TextInput source="frequency" label={label('frequency')} validate={maxLength(50)} parse={emptyToNull} />
              </SimpleFormIterator>
            </ArrayInput>
          </Grid>
        </Section>
      </TabbedForm.Tab>

      <TabbedForm.Tab label="app.tdr.tabs.requirements" path="requirements">
        <Section hint={translate('app.tdr.hints.requirements')}>
          <Grid size={12}>
            <ArrayInput source="extraction.requirements" label={false}>
              <SimpleFormIterator>
                <TextInput source="text" label={label('text')} validate={validateRequired(500)} multiline fullWidth />
              </SimpleFormIterator>
            </ArrayInput>
          </Grid>
        </Section>
      </TabbedForm.Tab>
    </TabbedForm>
  );
};

export default TdrForm;
