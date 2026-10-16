import type { ReactElement } from 'react';
import { SearchInput, useTranslate, type SearchInputProps, type TranslateFunction } from 'react-admin';
import { searchFilterSx } from '../styles/list';
import { mergeSx } from '../styles/sx';

// The search of a list. SearchInput has no floating label, so on its own it sits
// shorter than the labeled filters beside it; matching their height keeps the filter bar level.
// `placeholder` is a translation key (SearchInput passes a custom one through untranslated).
// Use it as <SearchFilter source="q" alwaysOn />, only on endpoints that accept `q`.
const SearchFilter = ({ sx, placeholder, ...props }: SearchInputProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <SearchInput
      {...props}
      {...(placeholder ? { placeholder: translate(placeholder) } : {})}
      sx={mergeSx(searchFilterSx, sx)}
    />
  );
};

export default SearchFilter;
