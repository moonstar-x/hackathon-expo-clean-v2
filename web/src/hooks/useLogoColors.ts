import { useEffect, useState } from 'react';
import { logoColors } from '../utils/logoColors';
import { readLogoPixels } from '../utils/logo';

/**
 * The colors a logo is made of, most used first, to offer as the company's main color. None while
 * they are read, without a logo, or when the browser can't read the image (no canvas): the color
 * picker works without them.
 */
const useLogoColors = (logo: Blob | null | undefined): string[] => {
  const [entry, setEntry] = useState<{ logo: Blob; colors: string[] } | undefined>(undefined);
  useEffect((): (() => void) | undefined => {
    if (!logo) return undefined;
    let current: boolean = true;
    readLogoPixels(logo)
      .then((pixels: Uint8ClampedArray): void => {
        if (current) setEntry({ logo, colors: logoColors(pixels) });
      })
      .catch((): void => {
        if (current) setEntry({ logo, colors: [] });
      });
    return (): void => {
      current = false;
    };
  }, [logo]);
  return logo && entry && entry.logo === logo ? entry.colors : [];
};

export default useLogoColors;
