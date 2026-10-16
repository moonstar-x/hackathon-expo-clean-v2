import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import ResponsiveSwitch from '../../../src/components/ResponsiveSwitch';
import { renderWithAdmin } from '../../renderWithAdmin';

const DESKTOP_WIDTH: number = 1280;

afterEach((): void => {
  window.innerWidth = DESKTOP_WIDTH;
});

describe('ResponsiveSwitch', () => {
  it('renders the desktop view on wide screens', (): void => {
    window.innerWidth = DESKTOP_WIDTH;
    renderWithAdmin(<ResponsiveSwitch mobile={<p>móvil</p>} desktop={<p>escritorio</p>} />);
    expect(screen.getByText('escritorio')).toBeInTheDocument();
    expect(screen.queryByText('móvil')).not.toBeInTheDocument();
  });

  it.each([390, 768])('renders the mobile view below the md breakpoint (%i px)', (width: number): void => {
    window.innerWidth = width;
    renderWithAdmin(<ResponsiveSwitch mobile={<p>móvil</p>} desktop={<p>escritorio</p>} />);
    expect(screen.getByText('móvil')).toBeInTheDocument();
    expect(screen.queryByText('escritorio')).not.toBeInTheDocument();
  });
});
