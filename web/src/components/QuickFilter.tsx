import { useEffect, useMemo, type ReactElement } from 'react';
import Chip from '@mui/material/Chip';
import { useListContext, useTranslate, type ListControllerResult, type TranslateFunction } from 'react-admin';
import type { QuickFilterProps } from '../types/components';
import { without } from '../utils/objects';

// A filter with no input of its own. react-admin applies `source`/`defaultValue` as
// soon as the filter is added, so the chip only names it.
// Usage: <QuickFilter source="needs_review" label="..." defaultValue="true" key="review" />
const QuickFilter = ({ label, excludes }: QuickFilterProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const list: ListControllerResult = useListContext();
  // react-admin types these two as `any`; they are plain objects keyed by filter source.
  const filterValues: Record<string, unknown> = list.filterValues as Record<string, unknown>;
  const displayedFilters: Record<string, unknown> = useMemo(
    (): Record<string, unknown> => (list.displayedFilters ?? {}) as Record<string, unknown>,
    [list.displayedFilters],
  );
  const { setFilters }: ListControllerResult = list;
  const clash: boolean =
    excludes !== undefined && (Object.hasOwn(filterValues, excludes) || Boolean(displayedFilters[excludes]));

  useEffect((): void => {
    if (!clash || excludes === undefined) return;
    setFilters(without(filterValues, excludes), without(displayedFilters, excludes));
  }, [clash, excludes, filterValues, displayedFilters, setFilters]);

  return <Chip label={translate(label)} size="small" sx={{ mb: 1 }} />;
};

export default QuickFilter;
