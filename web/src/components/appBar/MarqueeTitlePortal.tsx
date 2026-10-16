import { useEffect, useRef, type MutableRefObject, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';
import { TitlePortal } from 'react-admin';
import { applyMarquee } from '../../utils/marquee';

// On phones a page title wider than the
// AppBar slides back and forth instead of being cut off.
const MarqueeTitlePortal = (): ReactElement => {
  const isSmall: boolean = useMediaQuery((theme: Theme): string => theme.breakpoints.down('sm'));
  const boxRef: MutableRefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null);

  useEffect((): (() => void) | undefined => {
    const box: HTMLDivElement | null = boxRef.current;
    if (!isSmall || !box) return undefined;
    const check = (): void => applyMarquee(box);
    const resizeObserver: ResizeObserver = new ResizeObserver(check);
    const mutationObserver: MutationObserver = new MutationObserver(check);
    resizeObserver.observe(box);
    mutationObserver.observe(box, { childList: true, subtree: true, characterData: true });
    check();
    // Measure again once web fonts settle, since a font swap changes the text width.
    void document.fonts?.ready.then(check);
    return (): void => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [isSmall]);

  return (
    <Box
      ref={boxRef}
      sx={{
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        ...(isSmall
          ? {
              mr: 1,
              '@keyframes marqueeTitle': {
                '0%, 20%': { transform: 'translateX(0)' },
                '80%, 100%': { transform: 'translateX(var(--marquee-distance, 0px))' },
              },
              '& .marquee-active': {
                display: 'inline-block',
                whiteSpace: 'nowrap',
                animation: 'marqueeTitle var(--marquee-duration, 6s) ease-in-out infinite alternate',
              },
            }
          : {}),
      }}
    >
      {/* A span, not react-admin's default h6: the page's own h1 is the heading. */}
      <TitlePortal variantMapping={{ h6: 'span' }} />
    </Box>
  );
};

export default MarqueeTitlePortal;
