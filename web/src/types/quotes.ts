// API contract duplicated intentionally; this app compiles independently.
export interface QuoteParameterValues {
    monthlyWage: number;
    basicWage: number;
    employerContributionRate: number;
    reserveFundRate: number;
    applyReserveFund: boolean;
    otherPayrollRate: number;
    theoreticalWorkdaysPerYear: number;
    nonWorkedHolidaysPerYear: number;
    vacationWorkdaysPerYear: number;
    otherAbsenceDaysPerYear: number;
    hoursPerWorkday: number;
    productiveFraction: number;
    nightSurchargeRate: number;
    holidaySurchargeRate: number;
    nationalHolidaysPerYear: number;
    supervisorMonthlyCost: number;
    operatorsPerSupervisor: number;
    baseEppPerFte: number;
    criticalEppPerFte: number;
    mopCoverageM2: number;
    mopCost: number;
    mopReplacementsPerMonth: number;
    equipmentMonthly: number;
    transportMonthly: number;
    insuranceMonthly: number;
    administrationRate: number;
    contingencyRate: number;
    targetMargin: number;
    minimumMargin: number;
    vatRate: number;
    purchaseVatRate: number;
    targetWasteRate: number;
    uncontrolledWasteRate: number;
    flatRatePerM2: number | null;
    monthsPerYear: number;
    defaultTraffic: 'low' | 'medium' | 'high' | null;
    defaultScheduleId: number | null;
    defaultDaysPerMonth: number | null;
    defaultZoneTypeId: number | null;
    defaultFixtureVisitsPerDay: number | null;
    defaultMinutesPerFixture: number | null;
    defaultSolutionLitersPerFixture: number | null;
    defaultPaperSoapPerFixtureMonthly: number | null;
    fixtureDefaultsExcludeFloor: boolean;
}
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
export interface EngineInput {
    parameters: QuoteParameterValues;
    zoneTypes: Record<number, ZoneTypeValues>;
    schedules: Record<number, ScheduleValues>;
    products: Record<number, ProductValues>;
    quote: {
        assumptionsConfirmed: boolean;
        manualPrice: number | null;
        externalReferencePrice: number | null;
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
type NumericZoneField = 'floorArea' | 'wallArea' | 'serviceHoursPerDay' | 'daysPerMonth' | 'hoursBetweenCleanings' | 'cleaningsPerDay' | 'cleaningsPerMonth' | 'terminalsPerMonth' | 'terminalArea' | 'dailyCleaningHours' | 'terminalHours' | 'taskHours' | 'presenceHours' | 'billableHours' | 'nightFraction' | 'holidayFraction' | 'laborCost' | 'fte' | 'm2PerPersonInService' | 'dailySolutionLiters' | 'terminalSolutionLiters' | 'cleaningProductId' | 'cleaningConcentrate' | 'dailyDisinfectantId' | 'dailyDisinfectantConcentrate' | 'terminalDisinfectantId' | 'terminalDisinfectantConcentrate' | 'chemicalsTheoretical' | 'chemicalsWithWaste' | 'eppAndHygiene' | 'utensils' | 'directCost' | 'allocatedIndirect' | 'totalCost' | 'targetPrice' | 'costPerM2' | 'pricePerM2' | 'flatRateRevenue';
export type ZoneResult = Record<NumericZoneField, number> & {
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
export interface EngineResult {
    engineVersion: 1;
    status: 'needsReview' | 'simulation';
    causes: Issue[];
    warnings: Issue[];
    labor: Record<string, number>;
    zones: ZoneResult[];
    totals: Record<string, number>;
    costs: Record<string, number>;
    pricing: {
        targetMargin: number;
        targetPrice: number;
        minimumMargin: number;
        minimumPrice: number;
        breakEvenPrice: number;
        offeredPrice: number;
        isManualPrice: boolean;
        profit: number;
        margin: number;
        marginStatus: 'loss' | 'belowMinimum' | 'acceptable' | 'healthy';
        vat: number;
        totalWithVat: number;
        annualProfit: number;
        pricePerM2: number;
        negotiationRoom: number;
    };
    staffing: Record<string, number>;
    chemicals: Record<string, number>;
    flatRate: {
        rate: number;
        revenue: number;
        margin: number;
        zonesAtLoss: number | null;
        zonesBelowMinimum: number;
    };
    reference: {
        price: number | null;
        difference: number | null;
        relativeDifference: number | null;
    };
    breakdown: {
        key: string;
        amount: number;
        share: number | null;
    }[];
    purchasePlan: {
        rows: PurchasePlanRow[];
        totalPurchaseCost: number;
        totalWasteCost: number;
    };
    technicalOffer: TechnicalOfferRow[];
}
export interface TechnicalOfferRow {
    zoneId: number | null;
    name: string;
    zoneTypeName: string;
    risk: string;
    scheduleName: string;
    hoursBetweenCleanings: number;
    cleaningsPerDay: number;
    terminalsPerMonth: number;
    cleaningProduct: TechnicalProduct;
    dailyDisinfectant: TechnicalProduct;
    terminalDisinfectant: TechnicalProduct;
    solutionPerDailyCleaning: number;
    disinfectantPerCleaning: number;
    fte: number;
}
export interface TechnicalProduct {
    productId: number;
    name: string;
    dosePerLiter: number;
    doseUnit: string;
}
export interface Quote {
    id: number;
    measurementId: number | null;
    name: string;
    installationType: string | null;
    city: string | null;
    visitDate: string | null;
    measurementOrigin: string;
    assumptionsConfirmed: boolean;
    manualPrice: number | null;
    externalReferencePrice: number | null;
    notes: string | null;
    status: 'needsReview' | 'simulation' | null;
    calculation: {
        state: 'pending' | 'running' | 'done' | 'failed';
        error: string | null;
        calculatedAt: string | null;
        parametersRevision: number | null;
        isStale: boolean;
        inputRevision: number;
        isCurrent: boolean;
    };
    summary: {
        offeredPrice: number | null;
        totalCost: number | null;
        profit: number | null;
        margin: number | null;
        marginStatus: string | null;
        totalFloorArea: number | null;
        fte: number | null;
        activeZoneCount: number | null;
        zoneCount: number;
    };
    zones: ZoneInput[];
    result: EngineResult | null;
    snapshot: {
        parametersRevision: number;
        parameters: QuoteParameterValues;
        zoneTypes: Record<number, ZoneTypeValues>;
        schedules: Record<number, ScheduleValues>;
        products: Record<number, ProductValues>;
    } | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface WasteRow {
    productId: number;
    name: string;
    unit: string;
    theoretical: number;
    actual: number | null;
    realWasteRate: number | null;
    excess: number | null;
    excessCost: number | null;
    status: string;
}
export interface WasteControl {
    period: string;
    rows: WasteRow[];
    totalExcessCost: number;
}
