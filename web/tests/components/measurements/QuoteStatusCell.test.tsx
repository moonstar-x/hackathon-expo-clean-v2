import { describe, expect, it, vi, type Mock } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { testDataProvider, type DataProvider } from 'react-admin';
import QuoteStatusCell from '../../../src/components/measurements/QuoteStatusCell';
import type { Measurement } from '../../../src/types/api';
import { renderWithAdmin } from '../../renderWithAdmin';

const measurement = (quote: Measurement['quote']): Measurement => ({ id: 1, quote }) as unknown as Measurement;

describe('QuoteStatusCell', () => {
  it("shows the quote's state as a link to it, without opening the row", (): void => {
    const rowClick: Mock = vi.fn();
    renderWithAdmin(
      <div onClick={rowClick}>
        <QuoteStatusCell />
      </div>,
      { record: measurement({ id: 7, status: 'needsReview', calculationState: 'done' }), at: '/measurements' },
    );
    const link: HTMLElement = screen.getByRole('link', { name: 'Abrir cotización: Revisar' });
    expect(link).toHaveAttribute('href', '/quotes/7/show');
    fireEvent.click(link);
    expect(rowClick).not.toHaveBeenCalled();
  });

  it('creates the quote of a measurement without one, without opening the row', async (): Promise<void> => {
    const rowClick: Mock = vi.fn();
    const createMeasurementQuote: Mock = vi.fn((): Promise<{ id: number }> => Promise.resolve({ id: 9 }));
    const dataProvider: DataProvider = { ...testDataProvider(), createMeasurementQuote };
    renderWithAdmin(
      <div onClick={rowClick}>
        <QuoteStatusCell />
      </div>,
      { record: measurement(null), dataProvider, at: '/measurements' },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Crear cotización' }));
    expect(rowClick).not.toHaveBeenCalled();
    await waitFor((): void => {
      expect(createMeasurementQuote).toHaveBeenCalledWith(1);
    });
  });
});
