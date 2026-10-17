import type { allSettings } from './settings.ts';
import type { EngineInput, ZoneInput } from './types.ts';
type Settings = ReturnType<typeof allSettings>;
/** The settings a quote is calculated with: only the catalog rows its zones use, stock resolved once. */
export function snapshotFor(settings: Settings, zones: ZoneInput[]) {
    const zoneTypes = Object.fromEntries([...new Set(zones.map((z) => z.zoneTypeId))].filter((id): id is number => id !== null && !!settings.zoneTypes[id]).map((id) => [id, settings.zoneTypes[id]]));
    const schedules = Object.fromEntries([...new Set(zones.map((z) => z.scheduleId))].filter((id): id is number => id !== null && !!settings.schedules[id]).map((id) => [id, settings.schedules[id]]));
    const products = Object.fromEntries([...new Set(Object.values(zoneTypes).flatMap((t) => [t.cleaningProductId, t.dailyDisinfectantId, t.terminalDisinfectantId]))].filter((id) => settings.products[id]).map((id) => [id, settings.products[id]]));
    return { ...settings, zoneTypes, schedules, products };
}
/** What the engine calculates a quote from. */
export const engineInput = (snapshot: ReturnType<typeof snapshotFor>, quote: EngineInput['quote'], zones: ZoneInput[]): EngineInput => ({ parameters: snapshot.parameters, zoneTypes: snapshot.zoneTypes, schedules: snapshot.schedules, products: snapshot.products, quote, zones });
