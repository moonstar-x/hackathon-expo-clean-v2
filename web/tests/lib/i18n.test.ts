import { describe, expect, it } from 'vitest';
import { i18nProvider } from '../../src/i18n';
import { translateApiError, translateApiMessage } from '../../src/i18n/apiErrors';

describe('Spanish translations', () => {
  it('uses Spanish pluralization and interpolates framework messages', (): void => {
    expect(i18nProvider.getLocale()).toBe('es');
    expect(i18nProvider.translate('resources.products.name', { smart_count: 1 })).toBe('Producto');
    expect(i18nProvider.translate('resources.products.name', { smart_count: 4 })).toBe('Productos');
    expect(i18nProvider.translate('ra.action.bulk_actions', { smart_count: 1 })).toBe('1 elemento seleccionado');
    expect(i18nProvider.translate('ra.action.bulk_actions', { smart_count: 4 })).toBe('4 elementos seleccionados');
    expect(i18nProvider.translate('ra.validation.maxLength', { max: 50 })).toBe('Debe tener como máximo 50 caracteres.');
    expect(i18nProvider.translate('ra.navigation.page_range_info', { offsetBegin: 1, offsetEnd: 25, total: 40 })).toBe(
      '1–25 de 40',
    );
  });

  it('labels fields per resource and counts list results', (): void => {
    expect(i18nProvider.translate('resources.stock-movements.fields.createdAt')).toBe('Fecha');
    expect(i18nProvider.translate('resources.products.fields.createdAt')).toBe('Fecha de creación');
    expect(i18nProvider.translate('app.products.total', { smart_count: 1 })).toBe('1 producto');
    expect(i18nProvider.translate('app.products.total', { smart_count: 0 })).toBe('0 productos');
    expect(i18nProvider.translate('app.stockMovements.balanceLine', { smart_count: 1, quantity: '1 caja' })).toBe(
      'Queda 1 caja',
    );
    expect(i18nProvider.translate('app.stockMovements.balanceLine', { smart_count: 2, quantity: '2 cajas' })).toBe(
      'Quedan 2 cajas',
    );
  });

  it('translates variable API validation messages', (): void => {
    expect(translateApiMessage('Must have at most 3 decimal places')).toBe('Debe tener como máximo 3 decimales.');
    expect(translateApiMessage('Must be at most 100 characters')).toBe('Debe tener como máximo 100 caracteres.');
    expect(translateApiMessage('Must be greater than 0')).toBe('Debe ser mayor que 0.');
    expect(translateApiMessage('Category 25 does not exist')).toBe('La categoría con ID 25 no existe.');
    expect(translateApiMessage('Must be one of: IN, OUT, ADJUSTMENT')).toBe('Selecciona una de las opciones disponibles.');
    expect(translateApiMessage('Must be at least 8 characters')).toBe('Debe tener al menos 8 caracteres.');
    expect(translateApiMessage('User 4 not found')).toBe('El usuario con ID 4 no existe.');
    expect(translateApiMessage('A user with this email already exists')).toBe(
      'Ya existe un usuario con este correo electrónico.',
    );
    expect(translateApiError('You cannot delete your own account', 'CONFLICT')).toBe('No puedes eliminar tu propia cuenta.');
    expect(translateApiError('You cannot deactivate your own account', 'VALIDATION_ERROR')).toBe(
      'No puedes desactivar tu propia cuenta.',
    );
  });

  it('preserves stock quantities and record names in translated errors', (): void => {
    expect(translateApiError('Insufficient stock: requested 12.5 box, available 1 box', 'INSUFFICIENT_STOCK')).toBe(
      'Existencias insuficientes: cantidad solicitada 12,5 cajas; disponible 1 caja.',
    );
    expect(translateApiError('Category "Limpieza" is used by 2 product(s)', 'CONFLICT')).toBe(
      'La categoría «Limpieza» se utiliza en 2 productos.',
    );
  });

  it('uses a Spanish fallback for unexpected server messages', (): void => {
    expect(translateApiError('Unexpected internal detail', 'INTERNAL_ERROR')).toBe(
      'Se produjo un error interno del servidor. Inténtalo de nuevo.',
    );
    expect(translateApiError(undefined)).toBe('No se pudo completar la solicitud.');
  });
});
