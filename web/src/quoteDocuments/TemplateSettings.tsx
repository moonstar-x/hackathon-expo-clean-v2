import type { ReactElement } from 'react';
import { TEMPLATE_FIELDS } from '../constants/quoteDocuments';
import { documentText } from '../i18n/quoteDocuments';
import type { SettingGroup } from '../types/quoteDocuments';
import DocumentSettingsEdit from './DocumentSettingsEdit';

const groups: SettingGroup[] = [
  { title: documentText.numbering, fields: [['numberPrefix', 4], ['validityDays', 4], ['paperSize', 4]] },
  { title: documentText.texts, fields: [['paymentTerms', 12], ['introText', 12], ['termsText', 12]] },
];

/** Plantilla: how every quote document reads (numbering, validity, paper, commercial texts), at /template. */
const TemplateSettings = (): ReactElement => (
  <DocumentSettingsEdit title="app.menu.template" groups={groups} fields={TEMPLATE_FIELDS} />
);

export default TemplateSettings;
