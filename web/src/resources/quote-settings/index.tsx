import LayersIcon from '@mui/icons-material/Layers';
import SanitizerIcon from '@mui/icons-material/Sanitizer';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import type { SvgIconComponent } from '@mui/icons-material';
import type { ResourceProps } from 'react-admin';
import { CatalogCreate, CatalogEdit, CatalogList, ParametersEdit } from '../../quotes/Settings';

/** The calculator's parameters: a single record, edited at /quote-parameters/1. */
export const quoteParameters: Omit<ResourceProps, 'name'> = { edit: ParametersEdit, icon: SettingsIcon };

/** Each catalog the calculator reads, with its own menu icon. Equivalencias have no create: they come from measurements. */
const CATALOG_ICONS: Record<string, SvgIconComponent> = {
  'quote-zone-types': LayersIcon,
  'quote-schedules': ScheduleIcon,
  'quote-products': SanitizerIcon,
  'quote-location-types': SyncAltIcon,
};

export const quoteCatalogs: [string, Omit<ResourceProps, 'name'>][] = Object.entries(CATALOG_ICONS).map(
  ([resource, icon]: [string, SvgIconComponent]): [string, Omit<ResourceProps, 'name'>] => [
    resource,
    {
      list: <CatalogList resource={resource} />,
      edit: <CatalogEdit resource={resource} />,
      create: resource === 'quote-location-types' ? undefined : <CatalogCreate resource={resource} />,
      icon,
      recordRepresentation: resource === 'quote-location-types' ? 'label' : 'name',
    },
  ],
);
