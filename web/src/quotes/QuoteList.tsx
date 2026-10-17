import type { ReactElement } from 'react';
import { useGetResourceLabel, useTranslate, type TranslateFunction } from 'react-admin';
import PageHeader from '../components/PageHeader';
import DesktopList from '../components/quotes/List/DesktopList';
import MobileList from '../components/quotes/List/MobileList';
import ResponsiveSwitch from '../components/ResponsiveSwitch';

/** Cotizaciones: a table from `md`, cards below; quotes start from a measurement, so there is no create. */
export const QuoteList = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const getResourceLabel: (resource: string, count?: number) => string = useGetResourceLabel();
  return (
    <>
      <PageHeader eyebrow={translate('app.quotes.eyebrow')} title={getResourceLabel('quotes', 2)} />
      <ResponsiveSwitch mobile={<MobileList />} desktop={<DesktopList />} />
    </>
  );
};
