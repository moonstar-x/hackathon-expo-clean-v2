import type { Config } from '../config.ts';

/** Preserve an optional reverse-proxy prefix when building an absolute API URL. */
export function publicUrlFor(config: Pick<Config, 'publicUrl'>, path: string): string {
  return `${config.publicUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
