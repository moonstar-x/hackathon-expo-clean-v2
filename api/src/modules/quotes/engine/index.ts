import { round } from '../../../lib/numbers.ts';
import { OVERRIDABLE_PARAMETERS, type EngineInput, type Issue, type ProductValues, type QuoteOverrides, type QuoteParameterValues, type ZoneInput } from '../types.ts';
export type { EngineInput } from '../types.ts';
export const ceilX = (x: number) => Math.ceil(round(x, 9));
export const divide = (a: number, b: number) => b > 0 && Number.isFinite(b) && Number.isFinite(a / b) ? a / b : 0;
export function laborBase(p: QuoteParameterValues) {
    const annualLaborCost = p.monthlyWage * p.monthsPerYear + p.monthlyWage + p.basicWage + p.monthlyWage * p.monthsPerYear * (p.employerContributionRate + (p.applyReserveFund ? p.reserveFundRate : 0) + p.otherPayrollRate);
    const availableDaysPerYear = p.theoreticalWorkdaysPerYear - p.nonWorkedHolidaysPerYear - p.vacationWorkdaysPerYear - p.otherAbsenceDaysPerYear;
    const availableHoursPerYear = availableDaysPerYear * p.hoursPerWorkday;
    return { annualLaborCost, availableDaysPerYear, availableHoursPerYear, hourlyCost: divide(annualLaborCost, availableHoursPerYear), fteHoursPerMonth: divide(availableHoursPerYear, p.monthsPerYear), fteMonthlyCost: divide(annualLaborCost, p.monthsPerYear) };
}
/** The parameters with the quote's own values in their place. */
export function effectiveParameters(p: QuoteParameterValues, overrides: QuoteOverrides = {}): QuoteParameterValues {
    const values = { ...p };
    for (const key of OVERRIDABLE_PARAMETERS)
        if (overrides[key] !== undefined)
            values[key] = overrides[key];
    return values;
}
/** The price of an hour of labor: the one set, or the wage's. */
export const laborRate = (p: QuoteParameterValues, labor: ReturnType<typeof laborBase>) => p.laborHourlyRate ?? labor.hourlyCost;
/** How many times faster a worker cleans floor with a machine than without one. */
export const machineSpeedup = (p: QuoteParameterValues) => divide(p.machineRateM2PerHour, p.manualRateM2PerHour) || 1;
/** The floor a zone's work is priced on: the area chosen to be cleaned, the floor without objects, or the whole floor, at most the whole floor. */
export const cleanedAreaOf = (z: Pick<ZoneInput, 'floorArea' | 'freeArea' | 'cleanedArea'>) => Math.min(Math.max(0, z.cleanedArea ?? z.freeArea ?? z.floorArea ?? 0), z.floorArea ?? 0);
/** What the quote's own values change in each zone's calculation. */
export interface ZoneAdjustments {
    /** The price of an hour of labor, before night and holiday surcharges. */
    hourlyRate: number;
    /** Multiplies the billable hours, so the quote has the FTE it was given. */
    hoursFactor: number;
    chemicalsFactor: number;
    eppFactor: number;
}
export const productPrices = (p: ProductValues, params: QuoteParameterValues, factor: number = 1) => {
    const pricePerContainer = divide(p.publishedPrice, 1 + (p.publishedPriceIncludesVat ? params.purchaseVatRate : 0)) * factor;
    return { pricePerContainer, pricePerUnit: divide(pricePerContainer, p.presentationSize) };
};
export function fixtureWork(z: ZoneInput, p: QuoteParameterValues) {
    const causes: Issue[] = [];
    const add = (code: string) => causes.push({ code, zoneIndex: z.position, params: { zona: z.name } });
    const count = (z.toilets ?? 0) + (z.urinals ?? 0) + (z.sinks ?? 0);
    if (![z.toilets, z.urinals, z.sinks].every((n) => n !== null && Number.isInteger(n) && n >= 0))
        add('FIXTURE_COUNTS_MISSING');
    if (z.paperSoapMonthly === null || z.paperSoapMonthly < 0)
        add('FIXTURE_PAPER_SOAP_MISSING');
    if (count > 0 && ![z.fixtureVisitsPerDay, z.minutesPerFixture, z.solutionLitersPerFixture].every((n) => n !== null && n > 0))
        add('FIXTURE_ASSUMPTIONS_MISSING');
    if (count > 0 && !z.fixturesExcludeFloor)
        add('FIXTURE_DOUBLE_COUNT_UNCONFIRMED');
    const ok = causes.length === 0;
    const visits = z.fixtureVisitsPerDay ?? 0;
    return { causes, count, ok, hours: ok && count > 0 ? divide(count * (z.daysPerMonth ?? 0) * visits * (z.minutesPerFixture ?? 0), 60 * p.productiveFraction) : 0, solutionLiters: ok && count > 0 ? count * (z.daysPerMonth ?? 0) * visits * (z.solutionLitersPerFixture ?? 0) : 0, paperSoap: ok ? z.paperSoapMonthly ?? 0 : 0 };
}
const numericZoneFields = ['floorArea', 'cleanedArea', 'machines', 'wallArea', 'serviceHoursPerDay', 'daysPerMonth', 'hoursBetweenCleanings', 'cleaningsPerDay', 'cleaningsPerMonth', 'terminalsPerMonth', 'terminalArea', 'floorRateM2PerHour', 'cleaningDuration', 'dailyCleaningHours', 'terminalHours', 'taskHours', 'presenceHours', 'billableHours', 'nightFraction', 'holidayFraction', 'laborCost', 'fte', 'm2PerPersonInService', 'dailySolutionLiters', 'terminalSolutionLiters', 'cleaningProductId', 'cleaningConcentrate', 'dailyDisinfectantId', 'dailyDisinfectantConcentrate', 'terminalDisinfectantId', 'terminalDisinfectantConcentrate', 'chemicalsTheoretical', 'chemicalsWithWaste', 'eppAndHygiene', 'utensils', 'directCost', 'allocatedIndirect', 'totalCost', 'targetPrice', 'costPerM2', 'pricePerM2', 'flatRateRevenue'] as const;
export type ZoneResult = Record<typeof numericZoneFields[number], number> & {
    zoneId: number | null;
    name: string;
    position: number;
    risk: string | null;
    active: boolean;
    causes: Issue[];
    fixtures: {
        count: number;
        ok: boolean;
        hours: number;
        solutionLiters: number;
        paperSoap: number;
    };
    flatRateMargin: number | null;
    flatRateStatus: 'loss' | 'belowMinimum' | 'ok' | null;
};
export function computeZone(z: ZoneInput, input: EngineInput, labor: ReturnType<typeof laborBase>, adjust: ZoneAdjustments = { hourlyRate: labor.hourlyCost, hoursFactor: 1, chemicalsFactor: 1, eppFactor: 1 }): ZoneResult {
    const p = input.parameters;
    const t = input.zoneTypes[z.zoneTypeId ?? -1];
    const s = input.schedules[z.scheduleId ?? -1];
    const causes: Issue[] = [];
    const add = (code: string) => causes.push({ code, zoneIndex: z.position, params: { zona: z.name } });
    // Missing product lookups are also an incomplete zone type; never charge invented chemicals.
    if (!t || ![t.cleaningProductId, t.dailyDisinfectantId, t.terminalDisinfectantId].every((id) => input.products[id]))
        add('ZONE_TYPE_MISSING');
    if (!(z.floorArea !== null && z.floorArea > 0))
        add('ZONE_FLOOR_AREA_MISSING');
    if (!z.traffic || !['low', 'medium', 'high'].includes(z.traffic))
        add('ZONE_TRAFFIC_MISSING');
    if (!s)
        add('ZONE_SCHEDULE_MISSING');
    if (!(z.daysPerMonth !== null && z.daysPerMonth > 0 && z.daysPerMonth <= 31))
        add('ZONE_DAYS_INVALID');
    const active = causes.length === 0;
    const f = fixtureWork(z, p);
    causes.push(...f.causes);
    const { causes: _causes, ...fixtures } = f;
    const r: ZoneResult = { ...Object.fromEntries(numericZoneFields.map((k) => [k, 0])) as Record<typeof numericZoneFields[number], number>, zoneId: z.id ?? null, name: z.name, position: z.position, risk: t?.risk ?? null, active, causes, fixtures: active ? fixtures : { ...fixtures, count: 0, hours: 0, solutionLiters: 0, paperSoap: 0 }, flatRateMargin: null, flatRateStatus: null };
    if (!active)
        return r;
    r.floorArea = z.floorArea!;
    r.cleanedArea = cleanedAreaOf(z);
    r.machines = z.machines ?? 0;
    r.wallArea = z.wallArea ?? 0;
    r.serviceHoursPerDay = s.serviceHoursPerDay;
    r.daysPerMonth = z.daysPerMonth!;
    r.hoursBetweenCleanings = t.hoursBetweenCleanings[z.traffic!];
    r.cleaningsPerDay = Math.max(1, ceilX(divide(r.serviceHoursPerDay, r.hoursBetweenCleanings)));
    r.cleaningsPerMonth = r.cleaningsPerDay * r.daysPerMonth;
    r.terminalsPerMonth = z.terminalsPerMonth ?? t.suggestedTerminalsPerMonth;
    r.terminalArea = r.cleanedArea + (t.wallsInTerminal ? r.wallArea : 0);
    // Machines speed up the daily floor cleaning: each worker with one cleans the zone type's rate times the
    // general metric's ratio. They share the floor, so more machines shorten each cleaning, not the hours paid.
    r.floorRateM2PerHour = t.dailyRateM2PerHour * (r.machines > 0 ? machineSpeedup(p) : 1);
    r.cleaningDuration = divide(r.cleanedArea, r.floorRateM2PerHour * Math.max(1, r.machines) * p.productiveFraction);
    r.dailyCleaningHours = divide(r.cleanedArea * r.cleaningsPerMonth, r.floorRateM2PerHour * p.productiveFraction) + fixtures.hours;
    r.terminalHours = divide(r.terminalArea * r.terminalsPerMonth, t.terminalRateM2PerHour * p.productiveFraction);
    r.taskHours = r.dailyCleaningHours + r.terminalHours;
    r.presenceHours = z.fixedPosts * r.serviceHoursPerDay * r.daysPerMonth;
    r.billableHours = Math.max(r.taskHours, r.presenceHours) * adjust.hoursFactor;
    r.nightFraction = s.nightHoursFraction;
    r.holidayFraction = s.includesHolidays ? p.nationalHolidaysPerYear / 365 : 0;
    r.laborCost = r.billableHours * adjust.hourlyRate * (1 + r.nightFraction * p.nightSurchargeRate + r.holidayFraction * p.holidaySurchargeRate);
    r.fte = divide(r.billableHours, labor.fteHoursPerMonth);
    r.m2PerPersonInService = divide(r.cleanedArea * r.daysPerMonth * r.serviceHoursPerDay, r.billableHours);
    r.dailySolutionLiters = r.cleanedArea * r.cleaningsPerMonth * t.solutionLitersPerM2 + fixtures.solutionLiters;
    r.terminalSolutionLiters = r.terminalArea * r.terminalsPerMonth * t.solutionLitersPerM2;
    r.cleaningProductId = t.cleaningProductId;
    r.dailyDisinfectantId = t.dailyDisinfectantId;
    r.terminalDisinfectantId = t.terminalDisinfectantId;
    const cleaning = input.products[t.cleaningProductId];
    const daily = input.products[t.dailyDisinfectantId];
    const terminal = input.products[t.terminalDisinfectantId];
    r.cleaningConcentrate = (r.dailySolutionLiters + r.terminalSolutionLiters) * cleaning.dosePerLiter / 1000;
    r.dailyDisinfectantConcentrate = r.dailySolutionLiters * daily.dosePerLiter / 1000;
    r.terminalDisinfectantConcentrate = r.terminalSolutionLiters * terminal.dosePerLiter / 1000;
    const unitPrice = (product: ProductValues) => productPrices(product, p, adjust.chemicalsFactor).pricePerUnit;
    r.chemicalsTheoretical = r.cleaningConcentrate * unitPrice(cleaning) + r.dailyDisinfectantConcentrate * unitPrice(daily) + r.terminalDisinfectantConcentrate * unitPrice(terminal);
    r.chemicalsWithWaste = r.chemicalsTheoretical * (1 + p.targetWasteRate);
    r.eppAndHygiene = (r.fte * (p.baseEppPerFte + (t.risk === 'critical' ? p.criticalEppPerFte : 0)) + fixtures.paperSoap) * adjust.eppFactor;
    r.utensils = divide(r.cleanedArea, p.mopCoverageM2) * p.mopCost * p.mopReplacementsPerMonth;
    r.directCost = r.laborCost + r.chemicalsWithWaste + r.eppAndHygiene + r.utensils;
    return r;
}
export function marginStatus(margin: number, p: QuoteParameterValues, targetMargin: number = p.targetMargin) { return margin < 0 ? 'loss' : margin < p.minimumMargin - .00001 ? 'belowMinimum' : margin < targetMargin - .00001 ? 'acceptable' : 'healthy'; }
/** The quote's own target margin when it has one; the parameters' is only the default. */
export const targetMarginOf = (p: QuoteParameterValues, quote: EngineInput['quote']) => quote.targetMargin ?? p.targetMargin;
type Sum = (key: typeof numericZoneFields[number]) => number;
const sumZones = (zones: ZoneResult[]): Sum => (key) => zones.reduce((n,z) => n+z[key],0);

export function quoteCauses(input: EngineInput, zones: ZoneResult[], labor: ReturnType<typeof laborBase>) {
    const p=input.parameters;
    const causes: Issue[] = [];
    const add = (code: string) => causes.push({ code });
    if (!input.quote.assumptionsConfirmed)
        add('ASSUMPTIONS_NOT_CONFIRMED');
    const active = zones.filter((z) => z.active);
    if (!active.length)
        add('NO_ACTIVE_ZONES');
    causes.push(...zones.flatMap((z) => z.causes));
    if (!(p.targetMargin < 1))
        add('TARGET_MARGIN_INVALID');
    if (!(p.minimumMargin >= 0 && p.minimumMargin <= targetMarginOf(p, input.quote)))
        add('MINIMUM_MARGIN_INVALID');
    if (!(p.productiveFraction > 0))
        add('PRODUCTIVE_FRACTION_INVALID');
    if (!(p.operatorsPerSupervisor > 0))
        add('OPERATORS_PER_SUPERVISOR_INVALID');
    if (!(labor.availableHoursPerYear > 0))
        add('NO_AVAILABLE_HOURS');
    return causes;
}

export function computeCosts(p: QuoteParameterValues, sum: Sum) {
    const laborCost = sum('laborCost'), chemicalsTheoretical = sum('chemicalsTheoretical'), chemicalsWaste = sum('chemicalsWithWaste') - chemicalsTheoretical, eppAndHygiene = sum('eppAndHygiene'), utensils = sum('utensils');
    const directCost = laborCost + chemicalsTheoretical + chemicalsWaste + eppAndHygiene + utensils;
    const supervision = divide(sum('fte'), p.operatorsPerSupervisor) * p.supervisorMonthlyCost;
    const equipment = p.equipmentMonthly, transport = p.transportMonthly, insurance = p.insuranceMonthly;
    const operatingCost = directCost + supervision + equipment + transport + insurance, administration = operatingCost * p.administrationRate, contingency = (operatingCost + administration) * p.contingencyRate;
    const totalCost = operatingCost + administration + contingency, indirectToAllocate = totalCost - directCost;
    return { laborCost, chemicalsTheoretical, chemicalsWaste, eppAndHygiene, utensils, directCost, supervision, equipment, transport, insurance, operatingCost, administration, contingency, totalCost, indirectToAllocate };
}

export function computePricing(p: QuoteParameterValues, quote: EngineInput['quote'], costs: ReturnType<typeof computeCosts>, sum: Sum) {
    const {totalCost}=costs;
    const targetMargin = targetMarginOf(p, quote);
    const targetPrice = divide(totalCost, 1 - targetMargin), minimumPrice = divide(totalCost, 1 - p.minimumMargin);
    const offeredPrice = quote.manualPrice ?? targetPrice, profit = offeredPrice - totalCost, margin = divide(profit, offeredPrice), vat = offeredPrice * p.vatRate;
    return { targetMargin, isCustomMargin: quote.targetMargin != null, targetPrice, minimumMargin: p.minimumMargin, vatRate: p.vatRate, minimumPrice, breakEvenPrice: totalCost, offeredPrice, isManualPrice: quote.manualPrice !== null, profit, margin, marginStatus: marginStatus(margin, p, targetMargin), vat, totalWithVat: offeredPrice + vat, annualProfit: profit * p.monthsPerYear, pricePerM2: divide(offeredPrice, sum('cleanedArea')), negotiationRoom: Math.max(0, offeredPrice - minimumPrice) };
}

export function allocateZone(zone: ZoneResult, p: QuoteParameterValues, costs: ReturnType<typeof computeCosts>, targetMargin: number = p.targetMargin) {
    const {directCost,indirectToAllocate}=costs;
    const rate = p.flatRatePerM2 !== null && p.flatRatePerM2 > 0 ? p.flatRatePerM2 : 0;
    const z = { ...zone };
        z.allocatedIndirect = divide(z.directCost, directCost) * indirectToAllocate;
        z.totalCost = z.directCost + z.allocatedIndirect;
        z.targetPrice = divide(z.totalCost, 1 - targetMargin);
        z.costPerM2 = divide(z.totalCost, z.cleanedArea);
        z.pricePerM2 = divide(z.targetPrice, z.cleanedArea);
        z.flatRateRevenue = z.cleanedArea * rate;
        z.flatRateMargin = z.flatRateRevenue > 0 ? (z.flatRateRevenue - z.totalCost) / z.flatRateRevenue : null;
        z.flatRateStatus = z.flatRateMargin === null ? null : z.flatRateMargin < 0 ? 'loss' : z.flatRateMargin < p.minimumMargin ? 'belowMinimum' : 'ok';
    return z;
}

export function flatRateComparison(active: ZoneResult[], p: QuoteParameterValues, totalCost: number) {
    const rate=p.flatRatePerM2 !== null && p.flatRatePerM2>0 ? p.flatRatePerM2 : 0;
    const sum=sumZones(active);
    const revenue = sum('flatRateRevenue'), zonesAtLoss = rate > 0 ? active.filter((z) => z.flatRateStatus === 'loss').length : null;
    return { rate, revenue, margin: divide(revenue - totalCost, revenue), zonesAtLoss, zonesBelowMinimum: active.filter((z) => z.flatRateStatus === 'belowMinimum').length };
}

export function computeStaffing(p: QuoteParameterValues, sum: Sum, labor: ReturnType<typeof laborBase>, overrides: QuoteOverrides = {}) {
    return { peopleToHire: ceilX(sum('fte')), laborHourlyRate: laborRate(p, labor), personHours: sum('billableHours'), fte: sum('fte'), supervisors: divide(sum('fte'), p.operatorsPerSupervisor), machines: sum('machines'), isCustomWorkers: overrides.workers !== undefined };
}

export function chemicalSummary(p: QuoteParameterValues, costs: ReturnType<typeof computeCosts>) {
    const {chemicalsTheoretical,chemicalsWaste,totalCost}=costs;
    return { withWaste: chemicalsTheoretical + chemicalsWaste, uncontrolledWasteCost: chemicalsTheoretical * p.uncontrolledWasteRate, controlledWasteCost: chemicalsWaste, monthlyWasteSavings: chemicalsTheoretical * p.uncontrolledWasteRate - chemicalsWaste, annualWasteSavings: (chemicalsTheoretical * p.uncontrolledWasteRate - chemicalsWaste) * p.monthsPerYear, shareOfCost: divide(chemicalsTheoretical + chemicalsWaste, totalCost) };
}

export function referenceComparison(quote: EngineInput['quote'], offeredPrice: number) {
    const referencePrice = quote.externalReferencePrice;
    return { price: referencePrice, difference: referencePrice !== null && referencePrice > 0 ? offeredPrice - referencePrice : null, relativeDifference: referencePrice !== null && referencePrice > 0 ? offeredPrice / referencePrice - 1 : null };
}

export function priceBreakdown(costs: ReturnType<typeof computeCosts>, pricing: ReturnType<typeof computePricing>) {
    const {laborCost,chemicalsTheoretical,chemicalsWaste,eppAndHygiene,utensils,supervision,equipment,transport,insurance,administration,contingency}=costs;
    const {profit,offeredPrice}=pricing;
    return Object.entries({ labor: laborCost, chemicals: chemicalsTheoretical + chemicalsWaste, eppAndHygiene, utensils, supervision, fixed: equipment + transport + insurance, administrationAndContingency: administration + contingency, profit }).map(([key, amount]) => ({ key, amount, share: offeredPrice > 0 ? amount / offeredPrice : null }));
}

export function zoneTotals(sum: Sum) {
    return Object.fromEntries(numericZoneFields.filter((k) => !['serviceHoursPerDay', 'daysPerMonth', 'hoursBetweenCleanings', 'cleaningsPerDay', 'terminalsPerMonth', 'floorRateM2PerHour', 'cleaningDuration', 'nightFraction', 'holidayFraction', 'm2PerPersonInService', 'cleaningProductId', 'dailyDisinfectantId', 'terminalDisinfectantId', 'costPerM2', 'pricePerM2'].includes(k)).map((key) => [key, sum(key)]));
}

export function purchasePlan(input: EngineInput, active: ZoneResult[]) {
    const p=input.parameters;
    const factor=input.quote.overrides?.chemicalsFactor ?? 1;
    const rows = Object.values(input.products).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0).map((product) => {
        const theoretical = active.reduce((n, z) => n + (z.cleaningProductId === product.id ? z.cleaningConcentrate : 0) + (z.dailyDisinfectantId === product.id ? z.dailyDisinfectantConcentrate : 0) + (z.terminalDisinfectantId === product.id ? z.terminalDisinfectantConcentrate : 0), 0);
        const waste = theoretical * p.targetWasteRate, total = theoretical + waste, containers = ceilX(divide(total, product.presentationSize)), stock = product.effectiveStock, toBuy = Math.max(0, containers - stock);
        const prices = productPrices(product, p, factor);
        return { productId: product.id, name: product.name, unit: product.unit, presentationSize: product.presentationSize, ...prices, theoretical, waste, total, containers, stock, toBuy, purchaseCost: toBuy * prices.pricePerContainer, wasteCost: waste * prices.pricePerUnit };
    }).filter((r) => r.theoretical > 0);
    return { rows, totalPurchaseCost: rows.reduce((n, r) => n + r.purchaseCost, 0), totalWasteCost: rows.reduce((n, r) => n + r.wasteCost, 0) };
}

export function technicalOffer(input: EngineInput, active: ZoneResult[]) {
    return active.map((z) => { const original = input.zones.find((i) => i.position === z.position)!; const t = input.zoneTypes[original.zoneTypeId!]; const product = (id: number) => { const p = input.products[id]; return { productId: id, name: p.name, dosePerLiter: p.dosePerLiter, doseUnit: p.unit === 'L' ? 'ml' : 'g' }; }; const solutionPerDailyCleaning = divide(z.dailySolutionLiters, z.cleaningsPerMonth); return { zoneId: z.zoneId, name: z.name, zoneTypeName: t.name, risk: z.risk, scheduleName: input.schedules[original.scheduleId!].name, hoursBetweenCleanings: z.hoursBetweenCleanings, cleaningsPerDay: z.cleaningsPerDay, terminalsPerMonth: z.terminalsPerMonth, cleaningProduct: product(t.cleaningProductId), dailyDisinfectant: product(t.dailyDisinfectantId), terminalDisinfectant: product(t.terminalDisinfectantId), solutionPerDailyCleaning, disinfectantPerCleaning: solutionPerDailyCleaning * input.products[t.dailyDisinfectantId].dosePerLiter, fte: z.fte }; });
}

export function quoteWarnings(input: EngineInput, zones: ZoneResult[], pricing: ReturnType<typeof computePricing>, flatRate: ReturnType<typeof flatRateComparison>) {
    const p=input.parameters;
    const warnings: Issue[]=[];
    const active=zones.filter((z)=>z.active);
    const {zonesAtLoss,rate}=flatRate;
    const {margin}=pricing;
    if (zonesAtLoss !== null && zonesAtLoss > 0)
        warnings.push({ code: 'FLAT_RATE_ZONES_AT_LOSS', params: { tarifa: rate, n: zonesAtLoss } });
    if (margin < p.minimumMargin)
        warnings.push({ code: 'OFFERED_MARGIN_BELOW_MINIMUM' });
    for (const z of input.zones) {
        const result = zones.find((r) => r.position === z.position)!;
        const warn = (code: string) => warnings.push({ code, zoneIndex: z.position, params: { zona: z.name } });
        if (result.active && input.zoneTypes[z.zoneTypeId!].wallsInTerminal && z.wallArea === null)
            warn('WALLS_MISSING');
        if (z.isFloorApproximate)
            warn('FLOOR_AREA_APPROXIMATE');
        if (['toilets', 'urinals', 'sinks'].some((k) => z.sources[k] === 'scan'))
            warn('FIXTURES_DETECTED');
        if (result.active && result.risk === 'critical' && result.m2PerPersonInService > 250)
            warn('CRITICAL_DENSITY_ABOVE_LIMIT');
        if (result.active && result.cleaningDuration > result.hoursBetweenCleanings)
            warnings.push({ code: 'CLEANING_LONGER_THAN_INTERVAL', zoneIndex: z.position, params: { zona: z.name, horas: round(result.cleaningDuration, 1), intervalo: result.hoursBetweenCleanings, 'máquinas': result.machines } });
    }
    const general = active.filter((z) => z.risk !== 'critical' && z.serviceHoursPerDay > 8);
    if (divide(general.reduce((n, z) => n + z.cleanedArea * z.daysPerMonth * z.serviceHoursPerDay, 0), general.reduce((n, z) => n + z.billableHours, 0)) > 630)
        warnings.push({ code: 'GENERAL_DENSITY_ABOVE_LIMIT' });
    const byRisk = ['critical', 'semicritical', 'noncritical'].map((risk) => { const zs = active.filter((z) => z.risk === risk); return { area: zs.reduce((n, z) => n + z.cleanedArea, 0), cost: zs.reduce((n, z) => n + z.totalCost, 0) }; });
    if (byRisk.every((r) => r.area > 0) && !(byRisk[0].cost / byRisk[0].area > byRisk[1].cost / byRisk[1].area && byRisk[1].cost / byRisk[1].area > byRisk[2].cost / byRisk[2].area))
        warnings.push({ code: 'RISK_ORDER_INCOHERENT' });
    return warnings;
}

export function computeQuote(original: EngineInput) {
    const overrides=original.quote.overrides ?? {};
    const p=effectiveParameters(original.parameters,overrides);
    const input={...original,parameters:p};
    const labor=laborBase(p);
    const adjust: ZoneAdjustments={hourlyRate:laborRate(p,labor),hoursFactor:1,chemicalsFactor:overrides.chemicalsFactor ?? 1,eppFactor:overrides.eppFactor ?? 1};
    let preliminary=input.zones.map((z)=>computeZone(z,input,labor,adjust));
    // A set number of workers spreads their hours over the zones in proportion to the work each one needs.
    const neededHours=sumZones(preliminary.filter((z)=>z.active))('billableHours');
    if (overrides.workers !== undefined && neededHours>0 && labor.fteHoursPerMonth>0)
        preliminary=input.zones.map((z)=>computeZone(z,input,labor,{...adjust,hoursFactor:overrides.workers!*labor.fteHoursPerMonth/neededHours}));
    const sum=sumZones(preliminary.filter((z)=>z.active));
    const costs=computeCosts(p,sum);
    const pricing=computePricing(p,input.quote,costs,sum);
    const zones=preliminary.map((z)=>z.active ? allocateZone(z,p,costs,pricing.targetMargin) : z);
    const active=zones.filter((z)=>z.active);
    const totalsSum=sumZones(active);
    const flatRate=flatRateComparison(active,p,costs.totalCost);
    const causes=quoteCauses(input,zones,labor);
    return {
        engineVersion:1 as const,status:causes.length ? 'needsReview' as const : 'simulation' as const,
        causes,warnings:quoteWarnings(input,zones,pricing,flatRate),labor,zones,
        totals:zoneTotals(totalsSum),costs,pricing,
        staffing:computeStaffing(p,totalsSum,labor,overrides),chemicals:chemicalSummary(p,costs),flatRate,
        reference:referenceComparison(input.quote,pricing.offeredPrice),breakdown:priceBreakdown(costs,pricing),
        purchasePlan:purchasePlan(input,active),technicalOffer:technicalOffer(input,active),
        /** The parameters this quote was calculated with: the general ones with its own values in their place. */
        parameters:p,overrides,
    };
}
export type EngineResult = ReturnType<typeof computeQuote>;
