import type { QuoteParameterValues } from './parameters.ts';
export type { QuoteParameterValues };
export type Traffic = 'low' | 'medium' | 'high';
export type Risk = 'critical' | 'semicritical' | 'noncritical';
export type Source = 'scan' | 'app' | 'default' | 'manual';
export interface Issue {
    code: string;
    zoneIndex?: number;
    params?: Record<string, string | number>;
}
export interface ProductValues {
    id: number;
    name: string;
    use: string | null;
    presentationSize: number;
    unit: 'L' | 'kg';
    publishedPrice: number;
    publishedPriceIncludesVat: boolean;
    dosePerLiter: number;
    stockContainers: number | null;
    inventoryProductId: number | null;
    effectiveStock: number;
    presentationStatus: string | null;
    sourceUrl: string | null;
    note: string | null;
    active: boolean;
}
export interface ScheduleValues {
    id: number;
    code: string;
    name: string;
    serviceHoursPerDay: number;
    nightHoursFraction: number;
    includesHolidays: boolean;
    note: string | null;
    active: boolean;
}
export interface ZoneTypeValues {
    id: number;
    code: string;
    name: string;
    risk: Risk;
    dailyRateM2PerHour: number;
    terminalRateM2PerHour: number;
    hoursBetweenCleanings: Record<Traffic, number>;
    wallsInTerminal: boolean;
    suggestedTerminalsPerMonth: number;
    cleaningProductId: number;
    dailyDisinfectantId: number;
    terminalDisinfectantId: number;
    solutionLitersPerM2: number;
    countsFixtures: boolean;
    note: string | null;
    active: boolean;
}
export interface ZoneInput {
    id?: number;
    position: number;
    origin: 'scan' | 'manual';
    roomId: string | null;
    name: string;
    zoneTypeId: number | null;
    floorArea: number | null;
    wallArea: number | null;
    isFloorApproximate: boolean;
    traffic: Traffic | null;
    scheduleId: number | null;
    daysPerMonth: number | null;
    terminalsPerMonth: number | null;
    fixedPosts: number;
    /** Machines the floor is cleaned with; each one is run by a worker. */
    machines: number;
    /** The floor without the objects on it; null is the whole floor. */
    freeArea: number | null;
    /** The floor that is cleaned, from 0 to the whole floor; null is the floor without objects. */
    cleanedArea: number | null;
    measurementSource: 'measured' | 'plans' | 'estimated';
    observation: string | null;
    toilets: number | null;
    urinals: number | null;
    sinks: number | null;
    fixtureVisitsPerDay: number | null;
    minutesPerFixture: number | null;
    solutionLitersPerFixture: number | null;
    paperSoapMonthly: number | null;
    fixturesExcludeFloor: boolean;
    sources: Record<string, Source>;
}
/** Parameters a quote can set for itself, in place of the general ones. */
export const OVERRIDABLE_PARAMETERS = ['laborHourlyRate', 'supervisorMonthlyCost', 'operatorsPerSupervisor', 'mopCost', 'equipmentMonthly', 'transportMonthly', 'insuranceMonthly', 'administrationRate', 'contingencyRate', 'minimumMargin', 'vatRate', 'targetWasteRate', 'uncontrolledWasteRate'] as const;
export type OverridableParameter = typeof OVERRIDABLE_PARAMETERS[number];
/** A quote's own values, edited on its Resumen tab; an absent key uses the parameters or what the calculator works out. */
export type QuoteOverrides = Partial<Record<OverridableParameter, number>> & {
    /** Full-time people who do the work; the zones' billable hours are scaled so the quote has exactly this FTE. */
    workers?: number;
    /** Multiplies the chemicals' prices (their cost and the purchase plan's). */
    chemicalsFactor?: number;
    /** Multiplies EPP and hygiene. */
    eppFactor?: number;
};
export interface EngineInput {
    parameters: QuoteParameterValues;
    zoneTypes: Record<number, ZoneTypeValues>;
    schedules: Record<number, ScheduleValues>;
    products: Record<number, ProductValues>;
    quote: {
        assumptionsConfirmed: boolean;
        manualPrice: number | null;
        /** This quote's own target margin; null or absent uses parameters.targetMargin. */
        targetMargin?: number | null;
        externalReferencePrice: number | null;
        /** Absent or empty uses the parameters and the calculated values. */
        overrides?: QuoteOverrides;
    };
    zones: ZoneInput[];
}
export interface PurchasePlanRow {
    productId: number;
    name: string;
    unit: 'L' | 'kg';
    presentationSize: number;
    pricePerContainer: number;
    pricePerUnit: number;
    theoretical: number;
    waste: number;
    total: number;
    containers: number;
    stock: number;
    toBuy: number;
    purchaseCost: number;
    wasteCost: number;
}
