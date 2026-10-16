import type { ReactElement } from 'react';
import { useGetResourceLabel, useTranslate, type TranslateFunction } from 'react-admin';
import DesktopList from '../../components/categories/List/DesktopList';
import MobileList from '../../components/categories/List/MobileList';
import PageHeader from '../../components/PageHeader';
import ResponsiveSwitch from '../../components/ResponsiveSwitch';

const CategoryList = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const getResourceLabel: (resource: string, count?: number) => string = useGetResourceLabel();
  return (
    <>
      <PageHeader eyebrow={translate('app.menu.catalog')} title={getResourceLabel('categories', 2)} />
      <ResponsiveSwitch mobile={<MobileList />} desktop={<DesktopList />} />
    </>
  );
};

export default CategoryList;
