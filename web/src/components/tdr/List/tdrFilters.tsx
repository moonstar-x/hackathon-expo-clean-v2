import type { ReactElement } from 'react';
import { SelectInput } from 'react-admin';
import SearchFilter from '../../SearchFilter';

/** The search, always shown, and the state from the filter button. Labels come from resources.tdr-documents.fields. */
export const tdrFilters: ReactElement[] = [
  <SearchFilter key="q" source="q" alwaysOn placeholder="app.tdr.search" />,
  <SelectInput
    key="status"
    source="status"
    choices={['pending', 'running', 'done', 'failed'].map((id: string): { id: string; name: string } => ({ id, name: `app.tdr.status.${id}` }))}
    helperText={false}
  />,
];
