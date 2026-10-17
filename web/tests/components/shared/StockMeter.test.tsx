import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import StockMeter from '../../../src/components/StockMeter';
import { renderWithAdmin } from '../../renderWithAdmin';

describe('StockMeter', () => {
  it('measures the stock against twice the reorder level and says both in Spanish', (): void => {
    renderWithAdmin(<StockMeter quantity={3} reorderLevel={4} unit="box" />);
    const meter: HTMLElement = screen.getByRole('meter', { name: 'Existencias actuales' });
    expect(meter).toHaveAttribute('aria-valuenow', '3');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '8');
    expect(meter).toHaveAttribute('aria-valuetext', '3 cajas; nivel de reposición: 4 cajas');
    expect(screen.getByText('Nivel de reposición: 4 cajas')).toBeInTheDocument();
  });

  it('leaves the legend to the row beside it when small', (): void => {
    renderWithAdmin(<StockMeter quantity={0} reorderLevel={6} unit="L" size="small" />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', '0 L; nivel de reposición: 6 L');
    expect(screen.queryByText(/Nivel de reposición/)).not.toBeInTheDocument();
  });
});
