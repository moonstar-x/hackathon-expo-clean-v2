import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { registerServiceWorker } from '../../src/utils/serviceWorker';

type Register = (url: string) => Promise<void>;

// Stands in for window: runs the load listener straight away.
const stubPage = (serviceWorker: { register: Register } | undefined): void => {
  vi.stubGlobal('navigator', serviceWorker ? { serviceWorker } : {});
  vi.stubGlobal('window', { addEventListener: (_type: string, listener: () => void): void => listener() });
};

describe('service worker registration', () => {
  afterEach((): void => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('registers /sw.js in a production build', (): void => {
    vi.stubEnv('PROD', true);
    const register: Mock<Register> = vi.fn<Register>().mockResolvedValue(undefined);
    stubPage({ register });
    registerServiceWorker();
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('stays out of the way in dev', (): void => {
    vi.stubEnv('PROD', false);
    const register: Mock<Register> = vi.fn<Register>().mockResolvedValue(undefined);
    stubPage({ register });
    registerServiceWorker();
    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing where the browser has no service workers', (): void => {
    vi.stubEnv('PROD', true);
    stubPage(undefined);
    expect((): void => registerServiceWorker()).not.toThrow();
  });
});
