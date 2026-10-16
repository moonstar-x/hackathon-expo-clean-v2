import type { ReactElement } from 'react';
import { useGetResourceLabel, useTranslate, type TranslateFunction } from 'react-admin';
import PageHeader from '../../components/PageHeader';
import ResponsiveSwitch from '../../components/ResponsiveSwitch';
import DesktopList from '../../components/suppliers/List/DesktopList';
import MobileList from '../../components/suppliers/List/MobileList';

const SupplierList = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const getResourceLabel: (resource: string, count?: number) => string = useGetResourceLabel();
  return (
    <>
      <PageHeader eyebrow={translate('app.menu.catalog')} title={getResourceLabel('suppliers', 2)} />
      <ResponsiveSwitch mobile={<MobileList />} desktop={<DesktopList />} />
    </>
  );
};

export default SupplierList;
