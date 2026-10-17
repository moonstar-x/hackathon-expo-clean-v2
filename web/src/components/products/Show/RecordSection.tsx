import type { ReactElement } from 'react';
import { DateField, Labeled, useTranslate, type TranslateFunction } from 'react-admin';
import YesNoField from '../../fields/YesNoField';
import DetailGrid from '../../show/DetailGrid';
import ShowSection from '../../show/ShowSection';

/** The product's record in the catalog: whether it is still in use, and when it was created and changed. */
const RecordSection = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <ShowSection title={translate('app.products.sections.record')}>
      <DetailGrid>
        <Labeled source="active">
          <YesNoField source="active" />
        </Labeled>
        <Labeled>
          <DateField source="createdAt" showTime />
        </Labeled>
        <Labeled>
          <DateField source="updatedAt" showTime />
        </Labeled>
      </DetailGrid>
    </ShowSection>
  );
};

export default RecordSection;
