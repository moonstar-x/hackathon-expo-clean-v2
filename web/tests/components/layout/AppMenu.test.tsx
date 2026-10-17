import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import ListIcon from '@mui/icons-material/List';
import { ResourceDefinitionContextProvider, memoryStore, type ResourceDefinitions } from 'react-admin';
import AppMenu from '../../../src/components/menu/AppMenu';
import { renderWithAdmin } from '../../renderWithAdmin';

const resources: string[] = [
  'measurements',
  'quotes',
  'products',
  'stock-movements',
  'categories',
  'suppliers',
  'quote-zone-types',
  'quote-schedules',
  'quote-products',
  'quote-location-types',
  'users',
];
const definitions: ResourceDefinitions = Object.fromEntries(
  resources.map((name: string): [string, ResourceDefinitions[string]] => [name, { name, hasList: true, icon: ListIcon }]),
);

const Menu = (): ReactElement => (
  <ResourceDefinitionContextProvider definitions={definitions}>
    <AppMenu />
  </ResourceDefinitionContextProvider>
);

const SECTIONS: string[] = ['Inventario', 'Catálogo', 'Configuración de cotización', 'Administración'];

describe('AppMenu', () => {
  it('opens on home, Mediciones and Cotizaciones, then groups the screens by section, ending with Administración', async (): Promise<void> => {
    renderWithAdmin(<Menu />);
    expect(await screen.findByRole('menuitem', { name: 'Inicio' })).toBeInTheDocument();
    await screen.findByRole('menuitem', { name: 'Empresa' });
    expect(screen.getAllByRole('menuitem').map((item: HTMLElement): string => item.textContent ?? '')).toEqual([
      'Inicio',
      'Mediciones',
      'Cotizaciones',
      'Productos',
      'Movimientos',
      'Categorías',
      'Proveedores',
      'Parámetros',
      'Tipos de zona',
      'Horarios',
      'Productos de cotización',
      'Equivalencias de tipos',
      'Usuarios',
      'Plantilla',
      'Empresa',
    ]);
    // Outside a router, react-admin brings its own hash router.
    expect(screen.getByRole('menuitem', { name: 'Plantilla' })).toHaveAttribute('href', '#/template');
    expect(screen.getByRole('menuitem', { name: 'Empresa' })).toHaveAttribute('href', '#/company');
    expect(screen.queryByText('Empresa y plantilla')).not.toBeInTheDocument();
  });

  it('names each section in sentence case, between the groups it separates', async (): Promise<void> => {
    renderWithAdmin(<Menu />);
    await screen.findByRole('menuitem', { name: 'Empresa' });
    for (const name of SECTIONS) {
      const label: HTMLElement = screen.getByText(name);
      expect(label).toHaveTextContent(name);
      expect(getComputedStyle(label).opacity).toBe('1');
      expect(getComputedStyle(label).textTransform).not.toBe('uppercase');
      expect(getComputedStyle(label.parentElement as HTMLElement).textTransform).not.toBe('uppercase');
    }
    // Each name sits right before its group's first entry.
    const administration: HTMLElement = screen.getByText('Administración').parentElement as HTMLElement;
    expect(administration.nextElementSibling).toHaveTextContent('Usuarios');
    const quoting: HTMLElement = screen.getByText('Configuración de cotización').parentElement as HTMLElement;
    expect(quoting.nextElementSibling).toHaveTextContent('Parámetros');
  });

  it('keeps the section names mounted, hidden, while the sidebar is collapsed, so the groups do not jump', async (): Promise<void> => {
    renderWithAdmin(<Menu />, { store: memoryStore({ 'sidebar.open': false }) });
    await screen.findByRole('menuitem', { name: 'Empresa' });
    for (const name of SECTIONS) {
      const label: HTMLElement = screen.getByText(name);
      expect(label).toBeInTheDocument();
      expect(getComputedStyle(label).opacity).toBe('0');
    }
  });
});
