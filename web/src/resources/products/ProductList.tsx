import type { ReactElement } from 'react';
import { useGetResourceLabel, useTranslate, type TranslateFunction } from 'react-admin';
import PageHeader from '../../components/PageHeader';
import ResponsiveSwitch from '../../components/ResponsiveSwitch';
import DesktopList from '../../components/products/List/DesktopList';
import MobileList from '../../components/products/List/MobileList';

const ProductList = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const getResourceLabel: (resource: string, count?: number) => string = useGetResourceLabel();
  return (
    <>
      <PageHeader eyebrow={translate('app.menu.inventory')} title={getResourceLabel('products', 2)} />
      <ResponsiveSwitch mobile={<MobileList />} desktop={<DesktopList />} />
    </>
  );
};

export default ProductList;
