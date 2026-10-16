import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { ListContextProvider, type ListControllerResult } from 'react-admin';
import ListTotal from '../../../src/components/list/ListTotal';
import { renderWithAdmin } from '../../renderWithAdmin';

const listContext = (total: number | undefined, isPending: boolean): ListControllerResult =>
  ({ total, isPending }) as unknown as ListControllerResult;

describe('ListTotal', () => {
  it.each([
    [1, '1 producto'],
    [0, '0 productos'],
    [60, '60 productos'],
  ])('counts %i as "%s"', (total: number, text: string): void => {
    renderWithAdmin(
      <ListContextProvider value={listContext(total, false)}>
        <ListTotal message="app.products.total" />
      </ListContextProvider>,
    );
    expect(screen.getByRole('status')).toHaveTextContent(text);
  });

  it('shows nothing until the first page arrives', (): void => {
    renderWithAdmin(
      <ListContextProvider value={listContext(undefined, true)}>
        <ListTotal message="app.products.total" />
      </ListContextProvider>,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
