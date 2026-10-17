import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import {
  FunctionField,
  Labeled,
  ReferenceField,
  TextField,
  useRecordContext,
  useTranslate,
  type TranslateFunction,
} from 'react-admin';
import { NONE } from '../../../constants/components';
import { unitLabel } from '../../../i18n/units';
import { productDescriptionSx, productDetailsDividerSx, productDetailsGridSx } from '../../../styles/products';
import type { Product } from '../../../types/api';
import CopyFieldWrapper from '../../CopyFieldWrapper';
import ShowSection from '../../show/ShowSection';
import HazardousField from './HazardousField';
import SdsLinkField from './SdsLinkField';

/**
 * What the product is: its description, when it has one, leads; then how it is identified and sold,
 * and, under a rule, where it is kept and how to handle it. Labels come from resources.products.fields.
 */
const DetailsSection = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const record: Product | undefined = useRecordContext<Product>();
  return (
    <ShowSection title={translate('app.products.sections.details')}>
      {record?.description ? <Typography sx={productDescriptionSx}>{record.description}</Typography> : null}
      <Box sx={productDetailsGridSx}>
        <CopyFieldWrapper source="sku" label="resources.products.fields.sku" />
        <Labeled>
          <FunctionField<Product> source="unit" render={(product: Product): string => unitLabel(product.unit)} />
        </Labeled>
        <Labeled>
          <ReferenceField source="categoryId" reference="categories" />
        </Labeled>
        <Labeled>
          <ReferenceField source="supplierId" reference="suppliers" emptyText={NONE} />
        </Labeled>
      </Box>
      <Divider sx={productDetailsDividerSx} />
      <Box sx={productDetailsGridSx}>
        <Labeled>
          <TextField source="location" emptyText={NONE} />
        </Labeled>
        <Labeled label="app.products.sections.safety">
          <HazardousField />
        </Labeled>
        <Labeled label="app.products.sds">
          <SdsLinkField />
        </Labeled>
      </Box>
    </ShowSection>
  );
};

export default DetailsSection;
