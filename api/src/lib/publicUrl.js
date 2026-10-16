/** Preserve an optional reverse-proxy prefix when building an absolute API URL. */
export function publicUrlFor(config, path) {
  return `${config.publicUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
