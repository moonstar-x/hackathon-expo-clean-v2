// Styles of the sidebar menu (components/menu). A group starts with a hairline and its name, never a
// box: the hairline stays when the sidebar collapses to its icons, so the groups still read there.
import type { SxProps, Theme } from '@mui/material/styles';

/** Where the icons start inside the list: the items' 8 px left padding (theme `RaMenuItemLink`). */
const ICON_INSET: number = 8;
/** Space above the hairline, then the hairline and the gap down to the name. */
const RULE_TOP: number = 14;
const NAME_TOP: number = 24;
const NAME_LINE: number = 16;

/**
 * A section name under its hairline, lined up with the icons. The block is as tall open as collapsed
 * (40 px), so nothing below it moves while the sidebar opens or closes. The name never wraps: it is
 * hidden (not unmounted) while collapsed, and fades back in once the drawer has widened.
 */
export const sectionLabelSx = (open: boolean): SxProps<Theme> => (theme: Theme) => ({
  position: 'relative',
  boxSizing: 'border-box',
  height: NAME_TOP + NAME_LINE,
  pt: `${NAME_TOP}px`,
  px: `${ICON_INSET}px`,
  bgcolor: 'transparent',
  color: 'text.secondary',
  fontSize: 12,
  fontWeight: 600,
  lineHeight: `${NAME_LINE}px`,
  // The rule spans the menu, so it follows the drawer as it opens and closes; in the 50 px strip
  // that leaves about an icon's width, under the icons.
  '&::before': {
    content: '""',
    position: 'absolute',
    top: RULE_TOP,
    left: ICON_INSET,
    right: ICON_INSET,
    height: '1px',
    bgcolor: 'divider',
  },
  '& > span': {
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    opacity: open ? 1 : 0,
    // The drawer widens over 195 ms: the name waits for most of it. Closing, it fades at once.
    transition: theme.transitions.create('opacity', {
      duration: 150,
      easing: theme.transitions.easing.easeOut,
      delay: open ? 100 : 0,
    }),
    '@media (prefers-reduced-motion: reduce)': { transitionDelay: '0ms' },
  },
});
