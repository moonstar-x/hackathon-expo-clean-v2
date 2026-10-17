import type { ReactElement } from 'react';
import SectionDivider from '../components/SectionDivider';
import { COMPANY_FIELDS } from '../constants/quoteDocuments';
import { brandingText } from '../i18n/quoteDocuments';
import type { SettingGroup } from '../types/quoteDocuments';
import BrandingSection from './BrandingSection';
import DocumentSettingsEdit from './DocumentSettingsEdit';
import SignatureSection from './SignatureSection';

const groups: SettingGroup[] = [
  {
    title: brandingText.companyData,
    fields: [['tradeName', 6], ['legalName', 6], ['taxId', 4], ['city', 4], ['phone', 4], ['address', 12], ['email', 6], ['website', 6]],
  },
  { title: brandingText.legalRepresentative, hint: brandingText.legalRepresentativeHint, fields: [['signerName', 6], ['signerTitle', 6]] },
];

/**
 * Empresa: who issues the quotes (the company's data, who signs for it and its optional electronic
 * signature, then its logo and color), at /company.
 */
const CompanySettings = (): ReactElement => (
  <DocumentSettingsEdit title="app.menu.company" groups={groups} fields={COMPANY_FIELDS}>
    <SignatureSection />
    <SectionDivider />
    <BrandingSection />
  </DocumentSettingsEdit>
);

export default CompanySettings;
