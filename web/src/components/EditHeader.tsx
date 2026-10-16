import type { ReactElement, ReactNode } from 'react';
import {
  useEditContext,
  useGetRecordRepresentation,
  useGetResourceLabel,
  useTranslate,
  type EditControllerResult,
  type RaRecord,
  type TranslateFunction,
} from 'react-admin';
import { APP_LOCALE } from '../constants/app';
import type { FormHeaderProps } from '../types/components';
import PageHeader from './PageHeader';

/**
 * The heading of an edit page, passed to <Edit actions>: "Editar <recurso>" over the record's name.
 * Nothing until the record arrives; <Edit> already shows its title in the AppBar meanwhile.
 */
const EditHeader = ({ eyebrow, title, actions }: FormHeaderProps): ReactElement | null => {
  const translate: TranslateFunction = useTranslate();
  const { record, resource }: EditControllerResult<RaRecord> = useEditContext<RaRecord>();
  const getResourceLabel: (resource: string, count?: number) => string = useGetResourceLabel();
  const getRecordRepresentation: (record: RaRecord) => ReactNode = useGetRecordRepresentation(resource);
  if (!record) return null;
  const line: string = eyebrow
    ? translate(eyebrow)
    : translate('app.page.editing', { name: getResourceLabel(resource, 1).toLocaleLowerCase(APP_LOCALE) });
  return (
    <PageHeader eyebrow={line} title={title ? translate(title) : getRecordRepresentation(record)} actions={actions} />
  );
};

export default EditHeader;
