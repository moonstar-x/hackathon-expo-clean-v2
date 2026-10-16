// Component test setup: jest-dom matchers, cleanup between tests, and
// the few browser APIs jsdom lacks that MUI and react-admin touch.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import type { MediaQueryListStub } from './types';

// findBy* waits up to 1 s by default; with every file rendering at once, react-admin's async
// permission and data checks can take longer than that without anything being wrong.
configure({ asyncUtilTimeout: 5000 });

afterEach((): void => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
});

// Desktop width by default; a test that needs the phone layout sets window.innerWidth below 600.
const SM_BREAKPOINT: number = 600;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryListStub => {
    const maxWidth: RegExpMatchArray | null = query.match(/max-width:\s*([\d.]+)px/);
    const minWidth: RegExpMatchArray | null = query.match(/min-width:\s*([\d.]+)px/);
    const width: number = window.innerWidth;
    const matches: boolean = maxWidth
      ? width <= Number(maxWidth[1])
      : minWidth
        ? width >= Number(minWidth[1])
        : query.includes('prefers-reduced-motion') && document.documentElement.dataset.reducedMotion === 'true';
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: (): void => {},
      removeEventListener: (): void => {},
      addListener: (): void => {},
      removeListener: (): void => {},
      dispatchEvent: (): boolean => false,
    };
  },
});

if (window.innerWidth < SM_BREAKPOINT) window.innerWidth = 1280;

class ObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
}

Object.defineProperty(window, 'ResizeObserver', { writable: true, value: ObserverStub });
Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: ObserverStub });
window.scrollTo = (): void => {};
