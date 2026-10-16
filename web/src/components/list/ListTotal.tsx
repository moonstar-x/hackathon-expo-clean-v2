import type { ReactElement } from 'react';
import Typography from '@mui/material/Typography';
import { useListContext, useTranslate, type ListControllerResult, type TranslateFunction } from 'react-admin';
import { listTotalSx } from '../../styles/list';
import type { ListTotalProps } from '../../types/list';

/**
 * How many records match the list's current filters, across every page.
 * Nothing until the first page arrives; afterwards it updates in place and is announced.
 */
const ListTotal = ({ message }: ListTotalProps): ReactElement | null => {
  const { total, isPending }: ListControllerResult = useListContext();
  const translate: TranslateFunction = useTranslate();
  if (isPending || total === undefined) return null;
  return (
    <Typography variant="body2" color="text.secondary" role="status" sx={listTotalSx}>
      {translate(message, { smart_count: total })}
    </Typography>
  );
};

export default ListTotal;
