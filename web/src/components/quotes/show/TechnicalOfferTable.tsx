import type { ReactElement } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableFooter from '@mui/material/TableFooter';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useTranslate, type TranslateFunction } from 'react-admin';
import OfferFrequency from './OfferFrequency';
import OfferPerCleaning from './OfferPerCleaning';
import OfferZone from './OfferZone';
import ProductDoses from './ProductDoses';
import { number } from '../../../quotes/format';
import { offerFigureSx, offerTableSx } from '../../../styles/quotes';
import type { TechnicalOfferProps, TechnicalOfferRow } from '../../../types/quotes';

/**
 * The technical offer on wider screens: one row per zone, its twelve figures grouped in five
 * columns that read top-down, and the quote's total staff under them.
 */
const TechnicalOfferTable = ({ rows, totalFte }: TechnicalOfferProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <TableContainer>
      <Table size="small" sx={offerTableSx}>
        <TableHead>
          <TableRow>
            <TableCell>{translate('app.quotes.offer.zone')}</TableCell>
            <TableCell>{translate('app.quotes.offer.frequency')}</TableCell>
            <TableCell>{translate('app.quotes.offer.products')}</TableCell>
            <TableCell>{translate('app.quotes.offer.perCleaning')}</TableCell>
            <TableCell align="right">{translate('app.quotes.offer.staff')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(
            (row: TechnicalOfferRow, index: number): ReactElement => (
              <TableRow key={row.zoneId ?? `zone-${index}`}>
                <TableCell>
                  <OfferZone row={row} />
                </TableCell>
                <TableCell>
                  <OfferFrequency row={row} />
                </TableCell>
                <TableCell>
                  <ProductDoses row={row} />
                </TableCell>
                <TableCell>
                  <OfferPerCleaning row={row} />
                </TableCell>
                <TableCell align="right" sx={offerFigureSx}>
                  {number(row.fte)}
                </TableCell>
              </TableRow>
            ),
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>{translate('app.quotes.offer.total')}</TableCell>
            <TableCell align="right" sx={offerFigureSx}>
              {number(totalFte)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );
};

export default TechnicalOfferTable;
