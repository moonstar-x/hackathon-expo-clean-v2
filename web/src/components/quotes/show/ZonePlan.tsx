import { useMemo, type KeyboardEvent, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import { quoteText } from '../../../i18n/quotes';
import { number } from '../../../quotes/format';
import { cleanedArea } from '../../../utils/quotes';
import { bounds, centroid, svgPoints, turnPoint } from '../../../utils/geometry';
import type { GeometryRoom, Vec2 } from '../../../types/geometry';
import type { ZoneInput, ZonePlanProps } from '../../../types/quotes';

const NEUTRAL: Record<'light' | 'dark', string> = { light: '#f0efec', dark: '#383835' };

/** A room as drawn: its zone when it has one, and its shapes already turned. */
interface PlanRoom {
  room: GeometryRoom;
  zone?: ZoneInput;
  polygon: Vec2[];
  label: Vec2;
}

/**
 * The measurement's floor plan with each room in its zone's colour and labelled with its name and the floor
 * to clean, which follows the Resumen tab's changes. Choosing a room chooses its zone; choosing it again
 * goes back to the whole quote. While a zone is chosen the others fade.
 */
const ZonePlan = ({ geometry, zones, colors, selected, onSelect }: ZonePlanProps): ReactElement => {
  const theme: Theme = useTheme();
  const mode: 'light' | 'dark' = theme.palette.mode;
  const rooms: PlanRoom[] = useMemo((): PlanRoom[] => {
    const project: (point: Vec2) => Vec2 = turnPoint(geometry.planRotation);
    return geometry.rooms.filter((room: GeometryRoom): boolean => room.floorPolygon.length >= 3).map((room: GeometryRoom): PlanRoom => {
      const polygon: Vec2[] = room.floorPolygon.map(project);
      return { room, zone: zones.find((z: ZoneInput): boolean => z.roomId?.toLowerCase() === room.id.toLowerCase()), polygon, label: room.labelPosition ? project(room.labelPosition) : centroid(polygon) };
    });
  }, [geometry, zones]);
  const box: { min: Vec2; max: Vec2 } | null = bounds(rooms.flatMap((r: PlanRoom): Vec2[] => r.polygon));
  if (!box) return <Typography color="text.secondary">{quoteText.planError}</Typography>;
  const pad: number = 0.6;
  const width: number = box.max[0] - box.min[0] + pad * 2, height: number = box.max[1] - box.min[1] + pad * 2;
  const font: number = Math.max(width, height) / 30;
  const name: string = zones.find((z: ZoneInput): boolean => !!z.roomId)?.name ?? '';
  return (
    <Box component="svg" viewBox={`${box.min[0] - pad} ${box.min[1] - pad} ${width} ${height}`} role="img" aria-label={quoteText.simplePlanAlt.replace('{name}', name)} sx={{ display: 'block', width: '100%', maxHeight: '60vh', bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
      {rooms.map(({ room, zone, polygon, label }: PlanRoom): ReactElement => {
        const color: string | undefined = zone ? colors[zone.position] : undefined;
        const faded: boolean = selected !== null && zone?.position !== selected;
        const choose = (): void => { if (zone) onSelect(zone.position === selected ? null : zone.position); };
        return (
          <g key={room.id} role={zone ? 'button' : undefined} tabIndex={zone ? 0 : undefined} aria-pressed={zone ? zone.position === selected : undefined} aria-label={zone?.name} opacity={faded ? 0.35 : 1}
            style={{ cursor: zone ? 'pointer' : 'default', outline: 'none', transition: 'opacity 150ms' }}
            onClick={zone ? choose : undefined}
            onKeyDown={zone ? (event: KeyboardEvent): void => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); } } : undefined}>
            <polygon points={svgPoints(polygon)} fill={color ? alpha(color, mode === 'dark' ? 0.45 : 0.3) : NEUTRAL[mode]} stroke={theme.palette.background.paper} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            <polygon points={svgPoints(polygon)} fill="none" stroke={color ?? theme.palette.text.secondary} strokeWidth={zone?.position === selected ? 3 : 1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            <text x={label[0]} y={label[1]} textAnchor="middle" fill={theme.palette.text.primary} fontSize={font} style={{ fontFamily: theme.typography.fontFamily, pointerEvents: 'none' }}>
              <tspan x={label[0]} dy={-font * 0.3} fontSize={font * 0.8}>{zone?.name ?? room.detectedType ?? ''}</tspan>
              {zone && <tspan x={label[0]} dy={font * 1.1} fontWeight={700}>{`${number(cleanedArea(zone), 0)} m²`}</tspan>}
            </text>
          </g>
        );
      })}
    </Box>
  );
};

export default ZonePlan;
