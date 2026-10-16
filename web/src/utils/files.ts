import { DOWNLOAD_URL_LIFETIME } from '../constants/measurements';

/** The file name a Content-Disposition header gives (its UTF-8 form first), or `fallback` when it gives none. */
export const downloadName = (disposition: string | null, fallback: string): string => {
  const header: string = disposition ?? '';
  const encoded: RegExpExecArray | null = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      // A malformed escape: use the plain name.
    }
  }
  return /filename="([^"]+)"/i.exec(header)?.[1] ?? fallback;
};

/** Saves a Blob as a download, through a link the browser clicks on its own. */
export const saveBlob = (blob: Blob, name: string): void => {
  const url: string = URL.createObjectURL(blob);
  const link: HTMLAnchorElement = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout((): void => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME);
};
