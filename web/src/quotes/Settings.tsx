import type { ReactElement } from 'react';
import { Create, Edit, useGetResourceLabel, useTranslate, type TranslateFunction } from 'react-admin';
import CreateHeader from '../components/CreateHeader';
import EditHeader from '../components/EditHeader';
import PageHeader from '../components/PageHeader';
import CatalogDesktopList from '../components/quotes/settings/CatalogDesktopList';
import CatalogForm from '../components/quotes/settings/CatalogForm';
import CatalogMobileList from '../components/quotes/settings/CatalogMobileList';
import ParametersForm from '../components/quotes/settings/ParametersForm';
import ResponsiveSwitch from '../components/ResponsiveSwitch';
import { formPageSx } from '../styles/pages';
import type { CatalogProps } from '../types/quotes';

// The screens of "Configuración de cotización": the parameters and the four catalogs the calculator
// reads. Each catalog's screens are shared and take the catalog's resource name.

/** A catalog's list: a table from `md`, cards below. */
export const CatalogList = ({ resource }: CatalogProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const getResourceLabel: (resource: string, count?: number) => string = useGetResourceLabel();
  return (
    <>
      <PageHeader eyebrow={translate('app.menu.quoting')} title={getResourceLabel(resource, 2)} />
      <ResponsiveSwitch
        mobile={<CatalogMobileList resource={resource} />}
        desktop={<CatalogDesktopList resource={resource} />}
      />
    </>
  );
};

export const CatalogEdit = ({ resource }: CatalogProps): ReactElement => (
  <Edit resource={resource} mutationMode="pessimistic" redirect="list" actions={<EditHeader />} sx={formPageSx}>
    <CatalogForm resource={resource} withDelete />
  </Edit>
);

export const CatalogCreate = ({ resource }: CatalogProps): ReactElement => (
  <Create resource={resource} redirect="list" actions={<CreateHeader eyebrow="app.menu.quoting" />} sx={formPageSx}>
    <CatalogForm resource={resource} />
  </Create>
);

/** The single set of parameters, at /quote-parameters/1; saving stays on the page. */
export const ParametersEdit = (): ReactElement => (
  <Edit
    resource="quote-parameters"
    id={1}
    mutationMode="pessimistic"
    redirect={false}
    title="app.quoteSettings.parameters"
    actions={<EditHeader eyebrow="app.menu.quoting" title="app.quoteSettings.parameters" />}
    sx={formPageSx}
  >
    <ParametersForm />
  </Edit>
);
