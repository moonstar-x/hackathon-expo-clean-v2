import type { ReactElement } from 'react';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import { SearchInput, useTranslate, type SearchInputProps, type TranslateFunction } from 'react-admin';
import { searchFilterSx } from '../styles/list';
import { mergeSx } from '../styles/sx';

// The search of a list. SearchInput has no floating label, so on its own it sits
// shorter than the labeled filters beside it; matching their height keeps the filter bar level.
// The magnifier leads, and the end is left to the clear button.
// `placeholder` is a translation key (SearchInput passes a custom one through untranslated).
// Use it as <SearchFilter source="q" alwaysOn />, only on endpoints that accept `q`.
const SearchFilter = ({ sx, placeholder, ...props }: SearchInputProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <SearchInput
      {...props}
      {...(placeholder ? { placeholder: translate(placeholder) } : {})}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
      }}
      sx={mergeSx(searchFilterSx, sx)}
    />
  );
};

export default SearchFilter;
