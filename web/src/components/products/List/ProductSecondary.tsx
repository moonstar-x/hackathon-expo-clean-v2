import type { ReactElement } from 'react';
import Stack from '@mui/material/Stack';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import QrCode2Outlined from '@mui/icons-material/QrCode2Outlined';
import { ReferenceField, useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import type { Product } from '../../../types/api';
import { formatQuantity } from '../../../utils/format';
import MetaRow from '../../list/MetaRow';
import OutlinedBadge from '../../list/OutlinedBadge';

/** Mobile row details: SKU, stock against its reorder level, category, and whether it is archived. */
const ProductSecondary = (): ReactElement | null => {
  const record: Product | undefined = useRecordContext<Product>();
  const translate: TranslateFunction = useTranslate();
  if (!record) return null;
  return (
    <Stack component="span" spacing={0.5} sx={{ display: 'flex' }}>
      <MetaRow icon={QrCode2Outlined}>{record.sku}</MetaRow>
      <MetaRow icon={Inventory2Outlined}>
        {translate('app.products.stockLine', {
          quantity: formatQuantity(record.quantity, record.unit),
          reorder: formatQuantity(record.reorderLevel, record.unit),
        })}
      </MetaRow>
      <MetaRow icon={CategoryOutlined}>
        <ReferenceField source="categoryId" reference="categories" link={false} />
      </MetaRow>
      {record.active ? null : (
        <span>
          <OutlinedBadge label={translate('app.products.inactive')} dense />
        </span>
      )}
    </Stack>
  );
};

export default ProductSecondary;
