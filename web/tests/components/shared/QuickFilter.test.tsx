import { describe, expect, it, vi, type Mock } from 'vitest';
import { screen } from '@testing-library/react';
import { ListContextProvider, type ListControllerResult } from 'react-admin';
import QuickFilter from '../../../src/components/QuickFilter';
import { renderWithAdmin } from '../../renderWithAdmin';

const listContext = (
  filterValues: Record<string, unknown>,
  displayedFilters: Record<string, boolean>,
  setFilters: Mock,
): ListControllerResult => ({ filterValues, displayedFilters, setFilters }) as unknown as ListControllerResult;

describe('QuickFilter', () => {
  it('shows its translated label as a chip', (): void => {
    renderWithAdmin(
      <ListContextProvider value={listContext({}, {}, vi.fn())}>
        <QuickFilter source="lowStock" label="app.products.status.lowStock" />
      </ListContextProvider>,
    );
    expect(screen.getByText('Existencias bajas')).toBeInTheDocument();
  });

  it('removes the filter it excludes, value and chip alike', (): void => {
    const setFilters: Mock = vi.fn();
    renderWithAdmin(
      <ListContextProvider
        value={listContext({ lowStock: true, active: true }, { lowStock: true, active: true }, setFilters)}
      >
        <QuickFilter source="outOfStock" label="app.products.status.outOfStock" excludes="lowStock" />
      </ListContextProvider>,
    );
    expect(setFilters).toHaveBeenCalledWith({ active: true }, { active: true });
  });
});
