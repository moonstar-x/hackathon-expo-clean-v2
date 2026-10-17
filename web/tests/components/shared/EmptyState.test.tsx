import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import CategoryIcon from '@mui/icons-material/Category';
import {
  ListContextProvider,
  ResourceDefinitionContextProvider,
  type ListControllerResult,
  type ResourceDefinitions,
} from 'react-admin';
import EmptyState from '../../../src/components/list/EmptyState';
import { renderWithAdmin } from '../../renderWithAdmin';

const definitions: ResourceDefinitions = {
  categories: { name: 'categories', hasList: true, hasCreate: true, icon: CategoryIcon },
  products: { name: 'products', hasList: true, hasCreate: true },
};

const listContext = (filterValues: Record<string, unknown>, setFilters: Mock): ListControllerResult =>
  ({ filterValues, displayedFilters: {}, setFilters }) as unknown as ListControllerResult;

const Resources = ({ children }: { children: ReactNode }): ReactElement => (
  <ResourceDefinitionContextProvider definitions={definitions}>{children}</ResourceDefinitionContextProvider>
);

describe('EmptyState', () => {
  it('says what goes in an empty list and offers to create the first one', (): void => {
    renderWithAdmin(
      <Resources>
        <EmptyState variant="page" />
      </Resources>,
      { resource: 'categories', at: '/categories' },
    );
    expect(screen.getByRole('heading', { name: 'Todavía no hay categorías' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear categoría' })).toHaveAttribute('href', '/categories/create');
  });

  it('offers to clear the filters when they hide everything', (): void => {
    const setFilters: Mock = vi.fn();
    renderWithAdmin(
      <Resources>
        <ListContextProvider value={listContext({ q: 'zzz' }, setFilters)}>
          <EmptyState />
        </ListContextProvider>
      </Resources>,
      { resource: 'categories', at: '/categories' },
    );
    expect(screen.getByText('No hay resultados con estos filtros')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Borrar filtros' }));
    expect(setFilters).toHaveBeenCalledWith({}, {});
  });

  it("counts a list's own default filters as no filter, and clears back to them", (): void => {
    const setFilters: Mock = vi.fn();
    const { unmount } = renderWithAdmin(
      <Resources>
        <ListContextProvider value={listContext({ active: true }, setFilters)}>
          <EmptyState defaultFilters={{ active: true }} />
        </ListContextProvider>
      </Resources>,
      { resource: 'products', at: '/products' },
    );
    expect(screen.getByText('Todavía no hay productos')).toBeInTheDocument();
    unmount();

    renderWithAdmin(
      <Resources>
        <ListContextProvider value={listContext({ active: true, q: 'zzz' }, setFilters)}>
          <EmptyState defaultFilters={{ active: true }} />
        </ListContextProvider>
      </Resources>,
      { resource: 'products', at: '/products' },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Borrar filtros' }));
    expect(setFilters).toHaveBeenCalledWith({ active: true }, {});
  });
});
