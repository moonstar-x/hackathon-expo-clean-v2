import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App';
import { AppConfigContext } from './AppConfigContext';
import { writeAuth } from './providers/authStorage';
import { jsonResponse } from './test-utils';

let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = '';
  localStorage.clear();
});

const product = {
  id: 1, sku: 'DEMO', name: 'Producto de prueba', description: null, categoryId: 1, supplierId: 1,
  unit: 'box', quantity: 2, reorderLevel: 5, unitCost: 1.5, stockValue: 3, active: true,
  hazardous: false, isLowStock: true, createdAt: '2026-10-16T14:00:00Z', updatedAt: '2026-10-16T14:00:00Z',
};
const movement = {
  id: 1, productId: 1, type: 'IN', quantity: 2, delta: 2, balanceAfter: 2, reason: 'Initial stock',
  reference: null, createdBy: 'admin@example.com', createdAt: '2026-10-16T14:00:00Z',
};
// User 1 is the logged-in user (see writeAuth below).
const users = [
  { id: 1, email: 'admin@example.com', name: null, active: true, lastLoginAt: '2026-10-16T14:00:00Z', createdAt: '2026-10-16T14:00:00Z', updatedAt: '2026-10-16T14:00:00Z' },
  { id: 2, email: 'ana@example.com', name: 'Ana Pérez', active: true, lastLoginAt: null, createdAt: '2026-10-16T14:00:00Z', updatedAt: '2026-10-16T14:00:00Z' },
];
const config = { apiUrl: 'http://api.test/api', appTitle: 'Inventario de limpieza', currency: 'USD' };

it.each([
  ['/login', ['Correo electrónico', 'Contraseña', 'Iniciar sesión']],
  ['/', ['Productos activos', 'Existencias bajas', 'Movimientos recientes', 'Entrada']],
  ['/products', ['Productos', 'Nombre', 'Cantidad', 'Crear', '2 cajas']],
  ['/products/create', ['Nombre', 'Descripción', 'Unidad', 'Cantidad inicial', 'Guardar']],
  ['/products/1', ['Existencias actuales', 'Inventario', 'Seguridad', 'Guardar']],
  ['/products/1/show', ['Historial de inventario', 'Recibir existencias', 'Existencias iniciales']],
  ['/stock-movements', ['Movimientos de inventario', 'Registrar movimiento', 'Entrada', 'Existencias iniciales']],
  ['/stock-movements/create', ['Registrar movimiento de inventario', 'Entrada', 'Salida', 'Ajuste de inventario', 'Cantidad recibida']],
  ['/stock-movements/1/show', ['Movimiento n.º', 'Existencias resultantes', 'Existencias iniciales']],
  ['/categories', ['Categorías', 'Nombre', 'Descripción']],
  ['/categories/create', ['Crear Categoría', 'Nombre', 'Descripción', 'Guardar']],
  ['/suppliers', ['Proveedores', 'Nombre', 'Contacto', 'Correo electrónico']],
  ['/suppliers/create', ['Crear Proveedor', 'Nombre de contacto', 'Teléfono', 'Notas', 'Guardar']],
  ['/users', ['Usuarios', 'Nombre', 'Correo electrónico', 'Último acceso', 'Tú', 'Nunca']],
  ['/users/create', ['Crear Usuario', 'Correo electrónico', 'Contraseña', 'Activo', 'Guardar']],
  ['/users/2', ['Nueva contraseña', 'Déjala en blanco', 'Eliminar']],
  ['/users/1', ['Nueva contraseña', 'No puedes desactivar tu propia cuenta.']],
])('renders %s in Spanish', async (path, labels) => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('scrollTo', vi.fn());
  if (path !== '/login') {
    writeAuth({ token: 'test-token', expiresAt: new Date(Date.now() + 3600_000).toISOString(), userId: 1, email: 'admin@example.com', name: null });
  }
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const resource = url.pathname.split('/')[2];
    if (resource === 'stats') {
      return jsonResponse({ products: { total: 1, active: 1, lowStock: 1, outOfStock: 0 }, stockValue: 3 });
    }
    if (resource === 'users') {
      const id = Number(url.pathname.split('/')[3]);
      return /\/\d+$/.test(url.pathname)
        ? jsonResponse(users.find((u) => u.id === id))
        : jsonResponse(users, { headers: { 'Content-Range': `users 0-${users.length - 1}/${users.length}` } });
    }
    const record = resource === 'products' ? product
      : resource === 'stock-movements' ? movement
      : resource === 'categories' ? { id: 1, name: 'Limpieza', description: 'Descripción de prueba' }
      : { id: 1, name: 'Proveedor de prueba', contactName: 'Contacto de prueba', email: 'demo@example.com' };
    return jsonResponse(/\/\d+$/.test(url.pathname) ? record : [record], {
      headers: { 'Content-Range': `${resource} 0-0/1` },
    });
  }));
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(
    <MemoryRouter initialEntries={[path]}>
      <AppConfigContext.Provider value={config}>
        <App config={config} />
      </AppConfigContext.Provider>
    </MemoryRouter>,
  ));
  await vi.waitFor(async () => {
    await act(async () => { await Promise.resolve(); });
    for (const label of labels) expect(document.body.textContent).toContain(label);
  });
});
