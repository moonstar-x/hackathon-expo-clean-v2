import type { MeasurementMetadata } from '../measurements/schemas.ts';
import { round } from '../../lib/numbers.ts';
import type { EngineInput, Issue, Source, ZoneInput } from './types.ts';
interface GeometryRoom {
    id: string;
    walls: {
        dimensions: number[];
    }[];
    doors: {
        dimensions: number[];
    }[];
    windows: {
        dimensions: number[];
    }[];
    openings: {
        dimensions: number[];
    }[];
    objects: {
        category: string;
    }[];
}
export function deriveZones(rooms: MeasurementMetadata['rooms'], quoting: MeasurementMetadata['quoting'], geometryData: Buffer | null, settings: Omit<EngineInput, 'quote' | 'zones'>, equivalences: Record<string, number | null>) {
    const warnings: Issue[] = [];
    let geometry: GeometryRoom[] | null = null;
    try {
        const parsed = JSON.parse(geometryData!.toString('utf8'));
        if (!parsed || !Array.isArray(parsed.rooms) || !parsed.rooms.every((r: GeometryRoom | null) => r && typeof r.id === 'string' && ['walls','doors','windows','openings','objects'].every((k) => Array.isArray(r[k as keyof GeometryRoom])) && r.objects.every((o) => o && typeof o.category === 'string')))
            throw new Error('Invalid rooms');
        geometry = parsed.rooms;
    }
    catch {
        warnings.push({ code: 'GEOMETRY_UNAVAILABLE' });
    }
    const p = settings.parameters;
    const zones = [...rooms].sort((a, b) => a.index - b.index).map((room, position): ZoneInput => {
        const sources: Record<string, Source> = {};
        function choose<T>(field: string, ...choices: [
            T | null | undefined,
            Source
        ][]): T | null { for (const [value, source] of choices)
            if (value !== null && value !== undefined) {
                sources[field] = source;
                return value;
            } return null; }
        const mapped = (key: string | null | undefined) => { const id = key ? equivalences[key] : null; return id && settings.zoneTypes[id]?.active ? id : null; };
        const zoneTypeId = choose('zoneTypeId', [mapped(room.locationType), 'app'], [mapped(room.type), 'scan'], [p.defaultZoneTypeId, 'default']);
        let schedule = quoting?.scheduleCode ? Object.values(settings.schedules).find((s) => s.code === quoting.scheduleCode && s.active)?.id : null;
        if (quoting?.scheduleCode && !schedule)
            warnings.push({ code: 'SCHEDULE_CODE_UNKNOWN', zoneIndex: position, params: { 'código': quoting.scheduleCode } });
        schedule = choose('scheduleId', [schedule, 'app'], [p.defaultScheduleId, 'default']);
        const gr = geometry?.find((r) => r.id.toLowerCase() === room.id.toLowerCase());
        let wallArea: number | null = null;
        if (gr) {
            try {
                const area = (surfaces: {
                    dimensions: number[];
                }[]) => surfaces.reduce((a, s) => { const n = s.dimensions[0] * s.dimensions[1]; if (!Number.isFinite(n))
                    throw new Error('Invalid surface'); return a + n; }, 0);
                if (gr.walls.length)
                    wallArea = round(Math.max(0, area(gr.walls) - area(gr.doors) - area(gr.windows) - area(gr.openings)), 3);
            }
            catch {
                if (!warnings.some((w) => w.code === 'GEOMETRY_UNAVAILABLE'))
                    warnings.push({ code: 'GEOMETRY_UNAVAILABLE' });
            }
        }
        const detected = settings.zoneTypes[zoneTypeId ?? -1]?.countsFixtures && gr && Array.isArray(gr.objects) ? { toilets: gr.objects.filter((o) => o.category === 'toilet').length, urinals: 0, sinks: gr.objects.filter((o) => o.category === 'sink').length } : null;
        const fixtureValues = room.quoting?.fixtures ?? detected ?? { toilets: 0, urinals: 0, sinks: 0 };
        const fixtureSource: Source = room.quoting?.fixtures ? 'app' : detected ? 'scan' : 'default';
        for (const key of ['toilets', 'urinals', 'sinks'])
            sources[key] = fixtureSource;
        const count = fixtureValues.toilets + fixtureValues.urinals + fixtureValues.sinks;
        for (const key of ['name', 'floorArea', 'isFloorApproximate', 'measurementSource'])
            sources[key] = 'scan';
        if (wallArea !== null)
            sources.wallArea = 'scan';
        for (const key of ['terminalsPerMonth', 'fixtureVisitsPerDay', 'minutesPerFixture', 'solutionLitersPerFixture', 'paperSoapMonthly', 'fixturesExcludeFloor'])
            sources[key] = 'default';
        return { position, origin: 'scan', roomId: room.id.toLowerCase(), name: room.name, zoneTypeId, floorArea: room.floorArea, wallArea, isFloorApproximate: room.isFloorApproximate,
            traffic: choose('traffic', [room.quoting?.traffic, 'app'], [quoting?.traffic, 'app'], [p.defaultTraffic, 'default']), scheduleId: schedule,
            daysPerMonth: choose('daysPerMonth', [quoting?.daysPerMonth, 'app'], [p.defaultDaysPerMonth, 'default']), terminalsPerMonth: null, fixedPosts: choose('fixedPosts', [room.quoting?.fixedPosts, 'app'], [0, 'default'])!,
            measurementSource: 'measured', observation: null, ...fixtureValues, fixtureVisitsPerDay: count ? p.defaultFixtureVisitsPerDay : null, minutesPerFixture: count ? p.defaultMinutesPerFixture : null,
            solutionLitersPerFixture: count ? p.defaultSolutionLitersPerFixture : null, paperSoapMonthly: count ? (p.defaultPaperSoapPerFixtureMonthly === null ? null : p.defaultPaperSoapPerFixtureMonthly * count) : 0,
            fixturesExcludeFloor: count ? p.fixtureDefaultsExcludeFloor : false, sources };
    });
    return { zones, warnings };
}
