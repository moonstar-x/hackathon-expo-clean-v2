import type { ReactElement } from 'react';
import {
  FunctionField,
  Labeled,
  ReferenceField,
  TextField,
  UrlField,
  useTranslate,
  type TranslateFunction,
} from 'react-admin';
import { NONE } from '../../../constants/components';
import { unitLabel } from '../../../i18n/units';
import { wideFieldSx } from '../../../styles/pages';
import type { Product } from '../../../types/api';
import CopyFieldWrapper from '../../CopyFieldWrapper';
import DetailGrid from '../../show/DetailGrid';
import ShowSection from '../../show/ShowSection';
import HazardousField from './HazardousField';

/** What the product is, where it is kept and how to handle it. Labels come from resources.products.fields. */
const DetailsSection = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <ShowSection title={translate('app.products.sections.details')}>
      <DetailGrid>
        <CopyFieldWrapper source="sku" label="resources.products.fields.sku" />
        <Labeled>
          <ReferenceField source="categoryId" reference="categories" />
        </Labeled>
        <Labeled>
          <ReferenceField source="supplierId" reference="suppliers" emptyText={NONE} />
        </Labeled>
        <Labeled>
          <FunctionField<Product> source="unit" render={(record: Product): string => unitLabel(record.unit)} />
        </Labeled>
        <Labeled>
          <TextField source="location" emptyText={NONE} />
        </Labeled>
        <Labeled source="hazardous">
          <HazardousField />
        </Labeled>
        <Labeled sx={wideFieldSx}>
          <UrlField source="sdsUrl" target="_blank" rel="noopener noreferrer" emptyText={NONE} />
        </Labeled>
        <Labeled sx={wideFieldSx}>
          <TextField source="description" emptyText={NONE} />
        </Labeled>
      </DetailGrid>
    </ShowSection>
  );
};

export default DetailsSection;
