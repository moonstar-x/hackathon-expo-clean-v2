import { useEffect, useState } from 'react';

/**
 * An object URL for a Blob, revoked when the Blob changes or the component unmounts. The URL is
 * created in an effect, not during render, so StrictMode's second mount gets a live one.
 */
const useObjectUrl = (blob: Blob | undefined): string | undefined => {
  const [entry, setEntry] = useState<{ blob: Blob; url: string } | undefined>(undefined);
  useEffect((): (() => void) | undefined => {
    if (!blob) return undefined;
    const url: string = URL.createObjectURL(blob);
    // The object URL is an external resource that needs this cleanup, so it can't be derived in render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntry({ blob, url });
    return (): void => URL.revokeObjectURL(url);
  }, [blob]);
  return entry?.blob === blob ? entry?.url : undefined;
};

export default useObjectUrl;
