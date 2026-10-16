import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import Ribbon from '../../../src/components/Ribbon';
import { renderWithAdmin } from '../../renderWithAdmin';

describe('Ribbon', () => {
  it('hangs from the right edge by default, in the palette color', (): void => {
    renderWithAdmin(<Ribbon color="success">Con existencias</Ribbon>);
    const ribbon: HTMLElement = screen.getByText('Con existencias');
    expect(ribbon).toHaveStyle({ position: 'absolute', right: '-10px' });
  });

  it('can hang from the left edge as an outline', (): void => {
    renderWithAdmin(
      <Ribbon side="left" variant="outlined" size="small" color="#123456">
        Ajuste
      </Ribbon>,
    );
    const ribbon: HTMLElement = screen.getByText('Ajuste');
    expect(ribbon).toHaveStyle({ left: '-8px', color: '#123456' });
  });
});
