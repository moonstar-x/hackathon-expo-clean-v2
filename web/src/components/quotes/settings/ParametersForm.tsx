import { Fragment, type ReactElement } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Grid from '@mui/material/Grid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { TabbedForm, TextInput, useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import { PARAMETER_TABS } from '../../../constants/quoteSettings';
import type { ParameterField } from '../../../quotes/parameterFields';
import { notesAccordionSx, parametersGridSx } from '../../../styles/quotes';
import type { ParameterSection, ParameterTab } from '../../../types/quotes';
import FormToolbar from '../../FormToolbar';
import ResponsiveTabbedFormTabs from '../../ResponsiveTabbedFormTabs';
import Section from '../../Section';
import SectionDivider from '../../SectionDivider';
import ParameterInput from './ParameterInput';

/**
 * The calculator's parameters, one tab per group (44 values do not read as one page), each in
 * sections by topic with a line on what they are for; a tab about one topic has just the line. The
 * notes on where each value comes from wait in a fold below, and the toolbar says that saved values
 * reach existing quotes only once they are recalculated. The tabs don't change the address: there is
 * only ever one set of parameters.
 */
const ParametersForm = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const record: { notes?: Record<string, string> } | undefined = useRecordContext();
  return (
    <TabbedForm
      syncWithLocation={false}
      tabs={<ResponsiveTabbedFormTabs />}
      toolbar={<FormToolbar note={translate('app.quoteSettings.advice')} />}
    >
      {PARAMETER_TABS.map(
        (tab: ParameterTab): ReactElement => (
          <TabbedForm.Tab key={tab.title} label={tab.title}>
            {tab.sections.map(
              (section: ParameterSection, index: number): ReactElement => (
                <Fragment key={section.id}>
                  {index > 0 ? <SectionDivider /> : null}
                  <Section
                    title={
                      tab.sections.length > 1 ? translate(`app.quoteSettings.parameterSections.${section.id}`) : undefined
                    }
                    hint={translate(`app.quoteSettings.parameterHints.${section.id}`)}
                  >
                    {section.fields.map(
                      (field: ParameterField): ReactElement => (
                        <Grid key={field.name} size={{ xs: 12, sm: 6, lg: 4 }}>
                          <ParameterInput field={field} note={record?.notes?.[field.name]} />
                        </Grid>
                      ),
                    )}
                  </Section>
                </Fragment>
              ),
            )}
            <Accordion elevation={0} disableGutters sx={notesAccordionSx}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>{translate('app.quoteSettings.editNotes')}</AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2} sx={parametersGridSx}>
                  {tab.sections
                    .flatMap((section: ParameterSection): ParameterField[] => section.fields)
                    .map(
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
        ),
      )}
    </TabbedForm>
  );
};

export default ParametersForm;
