import type { ReactElement } from 'react';
import { ReferenceField, TextField, useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import { quoteEnums, quoteText } from '../../../i18n/quotes';
import { number } from '../../../quotes/format';
import type { CatalogProps } from '../../../types/quotes';

/**
 * A catalog card's detail line: a zone type's risk, a schedule's hours a day, a product's net price,
 * or the zone type a room type is quoted as.
 */
const CatalogSecondary = ({ resource }: CatalogProps): ReactElement | null => {
  const record: Record<string, unknown> | undefined = useRecordContext();
  const translate: TranslateFunction = useTranslate();
  if (!record) return null;
  switch (resource) {
    case 'quote-zone-types':
      return <>{quoteEnums[record.risk as string] ?? ''}</>;
    case 'quote-schedules':
      return <>{translate('app.quoteSettings.hoursPerDay', { hours: number(Number(record.serviceHoursPerDay), 1) })}</>;
    case 'quote-products':
      return <>{translate('app.quoteSettings.pricePerUnit', { price: number(Number(record.pricePerUnit)) })}</>;
    case 'quote-location-types':
      return record.zoneTypeId ? (
        <ReferenceField source="zoneTypeId" reference="quote-zone-types" link={false}>
          <TextField source="name" />
        </ReferenceField>
      ) : (
        <>{quoteText.unmapped}</>
      );
    default:
      return null;
  }
};

export default CatalogSecondary;
