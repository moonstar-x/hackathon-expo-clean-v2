import { MARQUEE_SPEED } from '../constants/components';

/**
 * Starts or stops the marquee on the title inside `box`, depending on whether it overflows.
 * Text width is measured with a Range (scrollWidth is unreliable in Chromium webviews) and the
 * effect is a CSS class plus custom properties, so checking never re-renders React.
 */
export const applyMarquee = (box: HTMLElement): void => {
  const title: HTMLElement | null = box.querySelector<HTMLElement>('#react-admin-title');
  if (!title) return;
  const range: Range = document.createRange();
  range.selectNodeContents(title);
  const textWidth: number = range.getBoundingClientRect().width;
  range.detach();
  const overflow: number = textWidth - box.clientWidth;
  if (overflow > 4) {
    // Moving phase is 60% of the cycle; keep the whole cycle between 5 and 10 seconds.
    const duration: number = Math.min(10, Math.max(5, overflow / MARQUEE_SPEED / 0.6));
    title.style.setProperty('--marquee-distance', `-${overflow}px`);
    title.style.setProperty('--marquee-duration', `${duration}s`);
    title.classList.add('marquee-active');
  } else {
    title.classList.remove('marquee-active');
    title.style.removeProperty('--marquee-distance');
    title.style.removeProperty('--marquee-duration');
  }
};
