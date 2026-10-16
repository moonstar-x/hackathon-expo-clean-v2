import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import AppUserMenu from '../../../src/components/appBar/UserMenu';
import { authProviderFor, renderWithAdmin } from '../../renderWithAdmin';

afterEach((): void => {
  window.innerWidth = 1280;
});

describe('UserMenu', () => {
  it('shows who is signed in, by name and email, and offers logout', async (): Promise<void> => {
    const user: UserEvent = userEvent.setup();
    renderWithAdmin(<AppUserMenu />);
    const trigger: HTMLElement = screen.getByRole('button', { name: 'Perfil' });
    expect(await within(trigger).findByText('Ana Pérez')).toBeInTheDocument();
    expect(within(trigger).getByText('ana@example.com')).toBeInTheDocument();
    expect(within(trigger).getByText('AP')).toBeInTheDocument();
    await user.click(trigger);
    const menu: HTMLElement = await screen.findByRole('menu');
    expect(within(menu).getByText('Ana Pérez')).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('shows the email once when the account has no name', async (): Promise<void> => {
    renderWithAdmin(<AppUserMenu />, {
      authProvider: authProviderFor({ id: 1, fullName: 'admin@example.com', email: 'admin@example.com' }),
    });
    const trigger: HTMLElement = screen.getByRole('button', { name: 'Perfil' });
    expect(await within(trigger).findAllByText('admin@example.com')).toHaveLength(1);
    expect(within(trigger).getByText('AD')).toBeInTheDocument();
  });

  it('keeps only the tile in the bar on phones, and moves the clock into the menu', async (): Promise<void> => {
    window.innerWidth = 390;
    const user: UserEvent = userEvent.setup();
    renderWithAdmin(<AppUserMenu />);
    const trigger: HTMLElement = screen.getByRole('button', { name: 'Perfil' });
    expect(await within(trigger).findByText('AP')).toBeInTheDocument();
    expect(within(trigger).queryByText('Ana Pérez')).not.toBeInTheDocument();
    await user.click(trigger);
    const menu: HTMLElement = await screen.findByRole('menu');
    expect(within(menu).getByText(/^[a-zé]{3}, \d{1,2} [a-z]{3,4}$/)).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Actualizar' })).toBeInTheDocument();
  });
});
