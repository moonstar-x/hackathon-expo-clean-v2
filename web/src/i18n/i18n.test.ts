import { describe, expect, it } from 'vitest';
import { translateApiError, translateApiMessage } from './apiErrors';
import { i18nProvider } from './provider';

describe('Spanish translations', () => {
  it('uses Spanish pluralization and interpolates framework messages', () => {
    expect(i18nProvider.getLocale()).toBe('es');
    expect(i18nProvider.translate('resources.products.name', { smart_count: 1 })).toBe('Producto');
    expect(i18nProvider.translate('resources.products.name', { smart_count: 4 })).toBe('Productos');
    expect(i18nProvider.translate('ra.action.bulk_actions', { smart_count: 1 })).toBe('1 elemento seleccionado');
    expect(i18nProvider.translate('ra.action.bulk_actions', { smart_count: 4 })).toBe('4 elementos seleccionados');
    expect(i18nProvider.translate('ra.validation.maxLength', { max: 50 })).toBe('Debe tener como máximo 50 caracteres.');
    expect(i18nProvider.translate('ra.navigation.page_range_info', { offsetBegin: 1, offsetEnd: 25, total: 40 })).toBe('1–25 de 40');
  });

  it('translates variable API validation messages', () => {
    expect(translateApiMessage('Must have at most 3 decimal places')).toBe('Debe tener como máximo 3 decimales.');
    expect(translateApiMessage('Must be at most 100 characters')).toBe('Debe tener como máximo 100 caracteres.');
    expect(translateApiMessage('Must be greater than 0')).toBe('Debe ser mayor que 0.');
    expect(translateApiMessage('Category 25 does not exist')).toBe('La categoría con ID 25 no existe.');
    expect(translateApiMessage('Must be one of: IN, OUT, ADJUSTMENT')).toBe('Selecciona una de las opciones disponibles.');
  });

  it('preserves stock quantities and record names in translated errors', () => {
    expect(translateApiError('Insufficient stock: requested 12.5 box, available 1 box', 'INSUFFICIENT_STOCK')).toBe(
      'Existencias insuficientes: cantidad solicitada 12,5 cajas; disponible 1 caja.',
    );
    expect(translateApiError('Category "Limpieza" is used by 2 product(s)', 'CONFLICT')).toBe(
      'La categoría «Limpieza» se utiliza en 2 productos.',
    );
  });

  it('uses a Spanish fallback for unexpected server messages', () => {
    expect(translateApiError('Unexpected internal detail', 'INTERNAL_ERROR')).toBe(
      'Se produjo un error interno del servidor. Inténtalo de nuevo.',
    );
    expect(translateApiError(undefined)).toBe('No se pudo completar la solicitud.');
  });
});
