import { useMemo, type KeyboardEvent, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme, type Theme } from '@mui/material/styles';
import { useAppConfig } from '../../../AppConfigContext';
import { quoteFields, quoteText } from '../../../i18n/quotes';
import { number } from '../../../quotes/format';
import { formatCurrency } from '../../../utils/format';
import { bounds, centroid, objectFootprint, svgPoints as path, turnPoint as turn } from '../../../utils/geometry';
import type { GeometryRoom, ScanGeometry, ScanObject, Vec2 } from '../../../types/geometry';
import type { ZoneInput, ZoneResult } from '../../../types/quotes';

/** The sequential blue ramp (steps 100 → 650): light is a low cost, dark a high one; dark mode reads it the other way. */
const RAMP: string[] = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#104281'];
/** Steps from here on are dark enough for white labels. */
const DARK_FROM: number = 3;
const NEUTRAL: Record<'light' | 'dark', string> = { light: '#f0efec', dark: '#383835' };

export interface QuotePlanProps {
  geometry: ScanGeometry;
  /** The quote's zones and their results, in the same order. */
  zones: ZoneInput[];
  results: ZoneResult[];
  /** Opens a zone's detail, by its position. */
  onSelect?: (position: number) => void;
}

/** A room as drawn: its zone and result when it has an active one, and its shapes already turned. */
interface PlanRoom {
  room: GeometryRoom;
  zone?: ZoneInput;
  result?: ZoneResult;
  polygon: Vec2[];
  label: Vec2;
  objects: Vec2[][];
}

/**
 * The measurement's floor plan with each room shaded by its zone's monthly cost and labelled with it, its
 * floor to clean and its machines. Scanned objects are drawn over the floor. Hovering a room shows its
 * figures; choosing one opens its zone. Rooms without an active zone stay gray.
 */
const QuotePlan = ({ geometry, zones, results, onSelect }: QuotePlanProps): ReactElement => {
  const theme: Theme = useTheme();
  const mode: 'light' | 'dark' = theme.palette.mode;
  const { currency }: { currency: string } = useAppConfig();
  const rooms: PlanRoom[] = useMemo((): PlanRoom[] => { const project: (point: Vec2) => Vec2 = turn(geometry.planRotation); return geometry.rooms.filter((room: GeometryRoom): boolean => room.floorPolygon.length >= 3).map((room: GeometryRoom): PlanRoom => {
    const index: number = zones.findIndex((z: ZoneInput): boolean => z.roomId?.toLowerCase() === room.id.toLowerCase());
    const result: ZoneResult | undefined = index >= 0 && results[index]?.active ? results[index] : undefined;
    const polygon: Vec2[] = room.floorPolygon.map(project);
    return { room, zone: index >= 0 ? zones[index] : undefined, result, polygon, label: room.labelPosition ? project(room.labelPosition) : centroid(polygon), objects: room.objects.map((o: ScanObject): Vec2[] => objectFootprint(o).map(project)) };
  }); }, [geometry, zones, results]);
  const box: { min: Vec2; max: Vec2 } | null = bounds(rooms.flatMap((r: PlanRoom): Vec2[] => r.polygon));
  const costs: number[] = rooms.flatMap((r: PlanRoom): number[] => r.result ? [r.result.totalCost] : []);
  const low: number = costs.length ? Math.min(...costs) : 0, high: number = costs.length ? Math.max(...costs) : 0;
  const step = (cost: number): number => high > low ? Math.round((cost - low) / (high - low) * (RAMP.length - 1)) : Math.floor(RAMP.length / 2);
  // Dark mode flips the anchor: low costs recede into the dark surface.
  const fill = (s: number): string => RAMP[mode === 'dark' ? RAMP.length - 1 - s : s];
  const ink = (s: number): string => (mode === 'dark' ? RAMP.length - 1 - s : s) >= DARK_FROM ? '#ffffff' : '#0b1b2e';
  if (!box) return <Typography color="text.secondary">{quoteText.planError}</Typography>;
  const pad: number = 0.6;
  const width: number = box.max[0] - box.min[0] + pad * 2, height: number = box.max[1] - box.min[1] + pad * 2;
  const font: number = Math.max(width, height) / 42;
  const name: string = zones.find((z: ZoneInput): boolean => !!z.roomId)?.name ?? '';
  return (
    <Box>
      <Box component="svg" viewBox={`${box.min[0] - pad} ${box.min[1] - pad} ${width} ${height}`} role="img" aria-label={quoteText.planAlt.replace('{name}', name)} sx={{ display: 'block', width: '100%', maxHeight: '70vh', bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
        {rooms.map(({ room, zone, result, polygon, label, objects }: PlanRoom): ReactElement => {
          const s: number | undefined = result ? step(result.totalCost) : undefined;
          const color: string = s === undefined ? NEUTRAL[mode] : fill(s);
          const text: string = s === undefined ? theme.palette.text.secondary : ink(s);
          const title: ReactElement = <Box sx={{ p: 0.5 }}>
            <Typography variant="subtitle2">{zone?.name ?? room.detectedType ?? room.id}</Typography>
            {result ? <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 2, '& dd': { m: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }}>
              <dt>{quoteFields.totalCost}</dt><dd>{formatCurrency(result.totalCost, currency)}</dd>
              <dt>{quoteFields.targetPrice}</dt><dd>{formatCurrency(result.targetPrice, currency)}</dd>
              <dt>{quoteFields.floorArea}</dt><dd>{number(result.floorArea)}</dd>
              <dt>{quoteFields.cleanedArea}</dt><dd>{number(result.cleanedArea ?? result.floorArea)}</dd>
              <dt>{quoteFields.machines}</dt><dd>{number(result.machines ?? 0, 0)}</dd>
              {result.cleaningDuration !== undefined && <><dt>{quoteFields.cleaningDuration}</dt><dd>{number(result.cleaningDuration, 1)}</dd></>}
              <dt>{quoteFields.fte}</dt><dd>{number(result.fte)}</dd>
            </Box> : <Typography variant="body2">{quoteText.planNotQuoted}</Typography>}
          </Box>;
          return (
            <Tooltip key={room.id} title={title} followCursor>
              <g role={zone && onSelect ? 'button' : undefined} tabIndex={zone && onSelect ? 0 : undefined} aria-label={zone ? `${zone.name}${result ? `: ${formatCurrency(result.totalCost, currency)}` : ''}` : undefined} style={{ cursor: zone && onSelect ? 'pointer' : 'default', outline: 'none' }}
                onClick={zone && onSelect ? (): void => onSelect(zone.position) : undefined}
                onKeyDown={zone && onSelect ? (event: KeyboardEvent): void => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(zone.position); } } : undefined}>
                <polygon points={path(polygon)} fill={color} stroke={theme.palette.background.paper} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                <polygon points={path(polygon)} fill="none" stroke={theme.palette.text.primary} strokeOpacity={0.55} strokeWidth={1} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                {objects.map((corners: Vec2[], i: number): ReactElement => <polygon key={i} points={path(corners)} fill={theme.palette.text.primary} fillOpacity={0.14} stroke={theme.palette.text.primary} strokeOpacity={0.35} strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
                <text x={label[0]} y={label[1]} textAnchor="middle" fill={text} fontSize={font} style={{ fontFamily: theme.typography.fontFamily, pointerEvents: 'none' }}>
                  <tspan x={label[0]} dy={-font * 0.9} fontSize={font * 0.85}>{zone?.name ?? room.detectedType ?? ''}</tspan>
                  <tspan x={label[0]} dy={font * 1.25} fontWeight={700}>{result ? formatCurrency(result.totalCost, currency) : quoteText.planNotQuoted}</tspan>
                  {result && <tspan x={label[0]} dy={font * 1.15} fontSize={font * 0.8}>{`${number(result.cleanedArea ?? result.floorArea)} m²${result.machines ? ` · ${number(result.machines, 0)} ${quoteFields.machines.toLowerCase()}` : ''}`}</tspan>}
                </text>
              </g>
            </Tooltip>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mt: 1.5 }}>
        {costs.length > 0 && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">{quoteText.planLegend}</Typography>
          <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(low, currency)}</Typography>
          <Box aria-hidden sx={{ width: 140, height: 10, borderRadius: 0.5, background: `linear-gradient(to right, ${RAMP.map((_c: string, i: number): string => fill(i)).join(', ')})` }} />
          <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(high, currency)}</Typography>
        </Box>}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box aria-hidden sx={{ width: 14, height: 10, bgcolor: NEUTRAL[mode], border: 1, borderColor: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">{quoteText.planNotQuoted}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box aria-hidden sx={{ width: 14, height: 10, bgcolor: 'text.primary', opacity: 0.2 }} />
          <Typography variant="caption" color="text.secondary">{quoteText.planObjects}</Typography>
        </Box>
        {onSelect && <Typography variant="caption" color="text.secondary">{quoteText.planHint}</Typography>}
      </Box>
    </Box>
  );
};

export default QuotePlan;
