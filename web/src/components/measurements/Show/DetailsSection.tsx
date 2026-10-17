import type { ReactElement } from 'react';
import { DateField, Labeled, TextField, useTranslate, type TranslateFunction } from 'react-admin';
import { NONE } from '../../../constants/components';
import DetailGrid from '../../show/DetailGrid';
import ShowSection from '../../show/ShowSection';

/** Where the measurement came from: when, by whom and with what. Labels come from resources.measurements.fields. */
const DetailsSection = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <ShowSection title={translate('app.measurements.details')}>
      <DetailGrid>
        <Labeled>
          <DateField source="scannedAt" showTime />
        </Labeled>
        <Labeled>
          <TextField source="createdBy" />
        </Labeled>
        <Labeled>
          <DateField source="createdAt" showTime />
        </Labeled>
        <Labeled>
          <TextField source="deviceModel" emptyText={NONE} />
        </Labeled>
        <Labeled>
          <TextField source="appVersion" emptyText={NONE} />
        </Labeled>
        <Labeled>
          <DateField source="updatedAt" showTime />
        </Labeled>
      </DetailGrid>
    </ShowSection>
  );
};

export default DetailsSection;
