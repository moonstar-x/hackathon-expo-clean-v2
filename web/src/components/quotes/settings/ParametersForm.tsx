import type { ReactElement } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { TabbedForm, TextInput, useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import { PARAMETER_GROUPS } from '../../../constants/quoteSettings';
import { parameterFields, type ParameterField } from '../../../quotes/parameterFields';
import { notesAccordionSx, parametersGridSx } from '../../../styles/quotes';
import FormToolbar from '../../FormToolbar';
import ResponsiveTabbedFormTabs from '../../ResponsiveTabbedFormTabs';
import ParameterInput from './ParameterInput';

/**
 * The calculator's parameters, one tab per group (44 values do not read as one page). Each tab says
 * that saved values reach existing quotes only once they are recalculated, lays its values out three
 * across, and keeps the notes on where each value comes from in a fold below. The tabs don't change
 * the address: there is only ever one set of parameters.
 */
const ParametersForm = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const record: { notes?: Record<string, string> } | undefined = useRecordContext();
  return (
    <TabbedForm syncWithLocation={false} tabs={<ResponsiveTabbedFormTabs />} toolbar={<FormToolbar />}>
      {PARAMETER_GROUPS.map(([title, start, end]: [string, number, number]): ReactElement => {
        const fields: ParameterField[] = parameterFields.slice(start, end);
        return (
          <TabbedForm.Tab key={title} label={title}>
            <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
              {translate('app.quoteSettings.advice')}
            </Alert>
            <Grid container spacing={2} sx={parametersGridSx}>
              {fields.map(
                (field: ParameterField): ReactElement => (
                  <Grid key={field.name} size={{ xs: 12, md: 6, lg: 4 }}>
                    <ParameterInput field={field} note={record?.notes?.[field.name]} />
                  </Grid>
                ),
              )}
            </Grid>
            <Accordion elevation={0} disableGutters sx={notesAccordionSx}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>{translate('app.quoteSettings.editNotes')}</AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2} sx={parametersGridSx}>
                  {fields.map(
                    (field: ParameterField): ReactElement => (
                      <Grid key={field.name} size={{ xs: 12, md: 6 }}>
                        <TextInput source={`notes.${field.name}`} label={field.label} fullWidth />
                      </Grid>
                    ),
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </TabbedForm.Tab>
        );
      })}
    </TabbedForm>
  );
};

export default ParametersForm;
