import type { ReactElement } from 'react';
import { ReferenceField } from 'react-admin';
import MovementTypeBadge from '../../fields/MovementTypeBadge';
import PrimaryRow from '../../list/PrimaryRow';

/** Mobile row title: the product moved, with the type badge top-right. */
const MovementPrimary = (): ReactElement => (
  <PrimaryRow end={<MovementTypeBadge dense />}>
    <ReferenceField source="productId" reference="products" link={false} />
  </PrimaryRow>
);

export default MovementPrimary;
