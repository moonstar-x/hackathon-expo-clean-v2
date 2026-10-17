import type { ReactElement } from 'react';
import { BooleanInput, type BooleanInputProps } from 'react-admin';
import { toggleFilterSx } from '../styles/list';
import { mergeSx } from '../styles/sx';

/**
 * A yes-only list filter ("Solo existencias bajas") drawn as a pill as tall as the inputs beside it,
 * tinted while it is on, so the filter bar stays on one level. Use it in a list's filters like a
 * BooleanInput: <ToggleFilter source="lowStock" alwaysOn />.
 */
const ToggleFilter = ({ sx, ...props }: BooleanInputProps): ReactElement => (
  <BooleanInput {...props} sx={mergeSx(toggleFilterSx, sx)} />
);

export default ToggleFilter;
