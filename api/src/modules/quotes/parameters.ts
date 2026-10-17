import { z } from 'zod';
import { decimal, foreignId } from '../../lib/validation.ts';
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
    /** Price of an hour of labor; null works it out from the wage (hourlyCost). */
    laborHourlyRate: number | null;
    /** m² of floor a worker cleans in an hour without a machine: the general metric. */
    manualRateM2PerHour: number;
    /** m² of floor a worker cleans in an hour with a machine. */
    machineRateM2PerHour: number;
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
export const parameterSchema = z.object({
    monthlyWage: decimal(6, { exclusiveMin: true }),
    basicWage: decimal(6),
    employerContributionRate: decimal(6).refine((n) => n <= 1, "Must be at most 1"),
    reserveFundRate: decimal(6).refine((n) => n <= 1, "Must be at most 1"),
    applyReserveFund: z.boolean(),
    otherPayrollRate: decimal(6).refine((n) => n <= 1, "Must be at most 1"),
    theoreticalWorkdaysPerYear: decimal(6).refine((n) => n <= 366, "Must be at most 366").refine((n) => n >= 1, "Must be at least 1"),
    nonWorkedHolidaysPerYear: decimal(6),
    vacationWorkdaysPerYear: decimal(6),
    otherAbsenceDaysPerYear: decimal(6),
    hoursPerWorkday: decimal(6, { exclusiveMin: true }).refine((n) => n <= 24, "Must be at most 24"),
    productiveFraction: decimal(6, { exclusiveMin: true }).refine((n) => n <= 1, "Must be at most 1"),
    nightSurchargeRate: decimal(6).refine((n) => n <= 10, "Must be at most 10"),
    holidaySurchargeRate: decimal(6).refine((n) => n <= 10, "Must be at most 10"),
    nationalHolidaysPerYear: decimal(6).refine((n) => n <= 365, "Must be at most 365"),
    laborHourlyRate: decimal(6).nullable(),
    manualRateM2PerHour: decimal(6, { exclusiveMin: true }),
    machineRateM2PerHour: decimal(6, { exclusiveMin: true }),
    supervisorMonthlyCost: decimal(6),
    operatorsPerSupervisor: decimal(6, { exclusiveMin: true }),
    baseEppPerFte: decimal(6),
    criticalEppPerFte: decimal(6),
    mopCoverageM2: decimal(6, { exclusiveMin: true }),
    mopCost: decimal(6),
    mopReplacementsPerMonth: decimal(6),
    equipmentMonthly: decimal(6),
    transportMonthly: decimal(6),
    insuranceMonthly: decimal(6),
    administrationRate: decimal(6).refine((n) => n <= 1, "Must be at most 1"),
    contingencyRate: decimal(6).refine((n) => n <= 1, "Must be at most 1"),
    targetMargin: decimal(6).refine((n) => n < 1, "Must be less than 1"),
    minimumMargin: decimal(6).refine((n) => n <= 1, "Must be at most 1"),
    vatRate: decimal(6).refine((n) => n <= 1, "Must be at most 1"),
    purchaseVatRate: decimal(6).refine((n) => n <= 1, "Must be at most 1"),
    targetWasteRate: decimal(6).refine((n) => n <= 1, "Must be at most 1"),
    uncontrolledWasteRate: decimal(6).refine((n) => n <= 1, "Must be at most 1"),
    flatRatePerM2: decimal(6).nullable(),
    monthsPerYear: decimal(6).refine((n) => n <= 12, "Must be at most 12").refine((n) => n >= 1, "Must be at least 1").refine(Number.isInteger, "Must be an integer"),
    defaultTraffic: z.enum(['low', 'medium', 'high']).nullable(),
    defaultScheduleId: foreignId().nullable(),
    defaultDaysPerMonth: decimal(6, { exclusiveMin: true }).refine((n) => n <= 31, "Must be at most 31").nullable(),
    defaultZoneTypeId: foreignId().nullable(),
    defaultFixtureVisitsPerDay: decimal(6, { exclusiveMin: true }).nullable(),
    defaultMinutesPerFixture: decimal(6, { exclusiveMin: true }).nullable(),
    defaultSolutionLitersPerFixture: decimal(6, { exclusiveMin: true }).nullable(),
    defaultPaperSoapPerFixtureMonthly: decimal(6).nullable(),
    fixtureDefaultsExcludeFloor: z.boolean(),
    notes: z.record(z.string(), z.string().max(500)).default({}),
}).superRefine((p, ctx) => {
    if (p.minimumMargin > p.targetMargin)
        ctx.addIssue({ code: 'custom', path: ['minimumMargin'], message: 'Must be less than or equal to the target margin' });
});
export const PARAMETER_FIELDS = Object.keys(parameterSchema.shape);
