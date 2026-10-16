import type { ReactElement } from 'react';
import { useGetResourceLabel, useTranslate, type TranslateFunction } from 'react-admin';
import DesktopList from '../../components/measurements/List/DesktopList';
import MobileList from '../../components/measurements/List/MobileList';
import PageHeader from '../../components/PageHeader';
import ResponsiveSwitch from '../../components/ResponsiveSwitch';

// Mediciones has no menu section, so its eyebrow names where measurements come from instead.
const MeasurementList = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const getResourceLabel: (resource: string, count?: number) => string = useGetResourceLabel();
  return (
    <>
      <PageHeader eyebrow={translate('app.measurements.eyebrow')} title={getResourceLabel('measurements', 2)} />
      <ResponsiveSwitch mobile={<MobileList />} desktop={<DesktopList />} />
    </>
  );
};

export default MeasurementList;
