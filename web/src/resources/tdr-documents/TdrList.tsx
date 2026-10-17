import type { ReactElement } from 'react';
import { useGetResourceLabel, useTranslate, type TranslateFunction } from 'react-admin';
import DesktopList from '../../components/tdr/List/DesktopList';
import MobileList from '../../components/tdr/List/MobileList';
import PageHeader from '../../components/PageHeader';
import ResponsiveSwitch from '../../components/ResponsiveSwitch';

const TdrList = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const getResourceLabel: (resource: string, count?: number) => string = useGetResourceLabel();
  return (
    <>
      <PageHeader eyebrow={translate('app.tdr.eyebrow')} title={getResourceLabel('tdr-documents', 2)} />
      <ResponsiveSwitch mobile={<MobileList />} desktop={<DesktopList />} />
    </>
  );
};

export default TdrList;
