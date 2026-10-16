import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import ListIcon from '@mui/icons-material/List';
import { ResourceDefinitionContextProvider, type ResourceDefinitions } from 'react-admin';
import AppMenu from '../../../src/components/menu/AppMenu';
import { renderWithAdmin } from '../../renderWithAdmin';

const definitions: ResourceDefinitions = {
  products: { name: 'products', hasList: true, icon: ListIcon },
  'stock-movements': { name: 'stock-movements', hasList: true, icon: ListIcon },
  categories: { name: 'categories', hasList: true, icon: ListIcon },
  suppliers: { name: 'suppliers', hasList: true, icon: ListIcon },
  users: { name: 'users', hasList: true, icon: ListIcon },
};

const Menu = (): ReactElement => (
  <ResourceDefinitionContextProvider definitions={definitions}>
    <AppMenu />
  </ResourceDefinitionContextProvider>
);

describe('AppMenu', () => {
  it('opens on home, then groups the screens under Inventario, Catálogo and Administración', async (): Promise<void> => {
    renderWithAdmin(<Menu />);
    expect(await screen.findByRole('menuitem', { name: 'Inicio' })).toBeInTheDocument();
    for (const name of ['Productos', 'Movimientos', 'Categorías', 'Proveedores', 'Usuarios']) {
      expect(screen.getByRole('menuitem', { name })).toBeInTheDocument();
    }
    expect(screen.getByText('Inventario')).toBeInTheDocument();
    expect(screen.getByText('Catálogo')).toBeInTheDocument();
    expect(screen.getByText('Administración')).toBeInTheDocument();
  });
});
