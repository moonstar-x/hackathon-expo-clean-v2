import type { SxProps, Theme } from '@mui/material/styles';
import { PALETTE_COLORS, RIBBON_SIZES } from '../constants/components';
import type { RibbonColor, RibbonColors, RibbonSide, RibbonSize, RibbonSizeConfig, RibbonVariant } from '../types/components';

const isPaletteColor = (color: string): color is RibbonColor => PALETTE_COLORS.has(color as RibbonColor);

export const ribbonColors = (theme: Theme, color: string): RibbonColors =>
  isPaletteColor(color) ? theme.palette[color] : { main: color, dark: color, contrastText: '#fff' };

/** A corner ribbon that overflows its card edge with a folded tip. */
export const ribbonSx = (
  theme: Theme,
  color: string,
  size: RibbonSize,
  variant: RibbonVariant,
  side: RibbonSide,
): SxProps<Theme> => {
  const { py, px, fontSize, fold }: RibbonSizeConfig = RIBBON_SIZES[size];
  const radius: number = Number(theme.shape.borderRadius);
  const { main, dark, contrastText }: RibbonColors = ribbonColors(theme, color);
  const right: boolean = side !== 'left';
  const outlined: boolean = variant === 'outlined';
  const foldColor: string = outlined ? main : dark;
  return {
    position: 'absolute',
    top: theme.spacing(2),
    ...(right ? { right: -fold } : { left: -fold }),
    display: 'inline-flex',
    alignItems: 'center',
    py,
    px,
    fontSize,
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    zIndex: 2,
    borderRadius: right ? `${radius}px 0 0 ${radius}px` : `0 ${radius}px ${radius}px 0`,
    overflow: 'visible',
    ...(outlined
      ? { backgroundColor: 'transparent', color: main, outline: `2px solid ${main}` }
      : { backgroundColor: main, color: contrastText }),
    '&::after': {
      content: '""',
      position: 'absolute',
      width: 0,
      height: 0,
      bottom: -fold,
      borderTop: `${fold}px solid ${foldColor}`,
      ...(right
        ? { right: 0, borderRight: `${fold}px solid transparent` }
        : { left: 0, borderLeft: `${fold}px solid transparent` }),
    },
  };
};

/** A card that carries a ribbon: positioned for it, and not clipping the part past its edge. */
export const ribbonCardSx: SxProps<Theme> = { position: 'relative', overflow: 'visible' };

/**
 * Right gutter for a column of cards where one carries a ribbon: the ribbon hangs into it instead
 * of touching the page edge, and every card in the column keeps the same width.
 */
export const ribbonGutterSx: SxProps<Theme> = { pr: `${RIBBON_SIZES.medium.fold}px` };
