import type { SortPayload } from 'react-admin';
import { quoteFields, quoteText } from '../i18n/quotes';
import { parameterFields, type ParameterField } from '../quotes/parameterFields';
import type { CatalogField, CatalogSection, ParameterTab, ParameterUnit } from '../types/quotes';

const note: CatalogField = { name: 'note', size: 12 };
const active: CatalogField = { name: 'active', type: 'boolean' };

/** The sections of each quoting catalog's form: what a record is, then what the calculator reads from it. */
export const CATALOG_SECTIONS: Record<string, CatalogSection[]> = {
  'quote-zone-types': [
    {
      title: 'app.quoteSettings.sections.identity',
      fields: [
        { name: 'code', size: 3 },
        { name: 'name', size: 6 },
        { name: 'risk', type: 'select', choices: ['critical', 'semicritical', 'noncritical'], size: 3 },
      ],
    },
    {
      title: 'app.quoteSettings.sections.performance',
      hint: 'app.quoteSettings.hints.performance',
      fields: [
        { name: 'dailyRateM2PerHour', type: 'number' },
        { name: 'terminalRateM2PerHour', type: 'number' },
        { name: 'suggestedTerminalsPerMonth', type: 'number' },
        { name: 'wallsInTerminal', type: 'boolean' },
      ],
    },
    {
      title: 'app.quoteSettings.sections.frequency',
      hint: 'app.quoteSettings.hints.frequency',
      fields: [
        { name: 'hoursBetweenCleanings.low', label: quoteFields.hoursBetweenLow, type: 'number' },
        { name: 'hoursBetweenCleanings.medium', label: quoteFields.hoursBetweenMedium, type: 'number' },
        { name: 'hoursBetweenCleanings.high', label: quoteFields.hoursBetweenHigh, type: 'number' },
      ],
    },
    {
      title: 'app.quoteSettings.sections.chemicals',
      hint: 'app.quoteSettings.hints.chemicals',
      fields: [
        { name: 'cleaningProductId', reference: 'quote-products', size: 4 },
        { name: 'dailyDisinfectantId', reference: 'quote-products', size: 4 },
        { name: 'terminalDisinfectantId', reference: 'quote-products', size: 4 },
        { name: 'solutionLitersPerM2', type: 'number' },
        { name: 'countsFixtures', type: 'boolean' },
      ],
    },
    { title: 'app.quoteSettings.sections.notes', hint: 'app.quoteSettings.hints.notes', fields: [note, active] },
  ],
  'quote-schedules': [
    {
      title: 'app.quoteSettings.sections.schedule',
      hint: 'app.quoteSettings.hints.schedule',
      fields: [
        { name: 'code', size: 3 },
        { name: 'name', size: 9 },
        { name: 'serviceHoursPerDay', type: 'number' },
        { name: 'nightHoursFraction', type: 'fraction' },
        { name: 'includesHolidays', type: 'boolean' },
      ],
    },
    { title: 'app.quoteSettings.sections.notes', hint: 'app.quoteSettings.hints.notes', fields: [note, active] },
  ],
  'quote-products': [
    {
      title: 'app.quoteSettings.sections.product',
      hint: 'app.quoteSettings.hints.product',
      fields: [
        { name: 'name' },
        { name: 'use' },
        { name: 'presentationSize', type: 'number' },
        { name: 'unit', type: 'select', choices: ['L', 'kg'] },
      ],
    },
    {
      title: 'app.quoteSettings.sections.price',
      hint: 'app.quoteSettings.hints.price',
      fields: [
        { name: 'publishedPrice', type: 'number' },
        { name: 'publishedPriceIncludesVat', type: 'boolean' },
      ],
    },
    {
      title: 'app.quoteSettings.sections.dose',
      hint: 'app.quoteSettings.hints.dose',
      fields: [
        { name: 'dosePerLiter', type: 'number' },
        { name: 'stockContainers', type: 'number' },
        { name: 'inventoryProductId', reference: 'products', size: 4 },
      ],
    },
    {
      title: 'app.quoteSettings.sections.source',
      hint: 'app.quoteSettings.hints.source',
      fields: [{ name: 'presentationStatus' }, { name: 'sourceUrl' }, note, active],
    },
  ],
  'quote-location-types': [
    {
      title: 'app.quoteSettings.sections.equivalence',
      hint: 'app.quoteSettings.hints.equivalence',
      fields: [{ name: 'zoneTypeId', reference: 'quote-zone-types' }],
    },
  ],
};

/** How each catalog lists: equivalences by room type, schedules by hours a day, the rest by name. */
export const CATALOG_SORT: Record<string, SortPayload> = {
  'quote-zone-types': { field: 'name', order: 'ASC' },
  'quote-schedules': { field: 'serviceHoursPerDay', order: 'ASC' },
  'quote-products': { field: 'name', order: 'ASC' },
  'quote-location-types': { field: 'label', order: 'ASC' },
};

/** The quoting parameters by name, for the tabs below. */
const byName = (...names: string[]): ParameterField[] =>
  names.map((name: string): ParameterField => {
    const field: ParameterField | undefined = parameterFields.find((candidate: ParameterField): boolean => candidate.name === name);
    if (!field) throw new Error(`Unknown quoting parameter: ${name}`);
    return field;
  });

/**
 * The parameters form's tabs, SPEC-005 §3.1's groups, each in sections by topic; a tab about one
 * topic has a single, untitled one. The quote's Supuestos tab lists the parameters in the same order.
 */
export const PARAMETER_TABS: ParameterTab[] = [
  {
    title: quoteText.payrollGroup,
    sections: [
      {
        id: 'wage',
        fields: byName('monthlyWage', 'basicWage', 'employerContributionRate', 'reserveFundRate', 'applyReserveFund', 'otherPayrollRate'),
      },
      {
        id: 'workdays',
        fields: byName(
          'theoreticalWorkdaysPerYear',
          'nonWorkedHolidaysPerYear',
          'vacationWorkdaysPerYear',
          'otherAbsenceDaysPerYear',
          'hoursPerWorkday',
          'productiveFraction',
        ),
      },
      { id: 'surcharges', fields: byName('nightSurchargeRate', 'holidaySurchargeRate', 'nationalHolidaysPerYear') },
    ],
  },
  {
    title: quoteText.supervisionGroup,
    sections: [
      { id: 'supervision', fields: byName('supervisorMonthlyCost', 'operatorsPerSupervisor') },
      { id: 'epp', fields: byName('baseEppPerFte', 'criticalEppPerFte') },
      { id: 'mops', fields: byName('mopCoverageM2', 'mopCost', 'mopReplacementsPerMonth') },
    ],
  },
  {
    title: quoteText.fixedGroup,
    sections: [
      { id: 'monthly', fields: byName('equipmentMonthly', 'transportMonthly', 'insuranceMonthly') },
      { id: 'overhead', fields: byName('administrationRate', 'contingencyRate') },
    ],
  },
  {
    title: quoteText.marginGroup,
    sections: [
      { id: 'margin', fields: byName('targetMargin', 'minimumMargin') },
      { id: 'vat', fields: byName('vatRate', 'purchaseVatRate') },
    ],
  },
  { title: quoteText.chemicalsGroup, sections: [{ id: 'chemicals', fields: byName('targetWasteRate', 'uncontrolledWasteRate') }] },
  { title: quoteText.comparisonGroup, sections: [{ id: 'comparison', fields: byName('flatRatePerM2', 'monthsPerYear') }] },
  {
    title: quoteText.defaultsGroup,
    sections: [
      { id: 'defaults', fields: byName('defaultTraffic', 'defaultScheduleId', 'defaultDaysPerMonth', 'defaultZoneTypeId') },
    ],
  },
  {
    title: quoteText.fixturesGroup,
    sections: [
      {
        id: 'fixtures',
        fields: byName(
          'defaultFixtureVisitsPerDay',
          'defaultMinutesPerFixture',
          'defaultSolutionLitersPerFixture',
          'defaultPaperSoapPerFixtureMonthly',
          'fixtureDefaultsExcludeFloor',
        ),
      },
    ],
  },
];

/**
 * The unit beside each numeric parameter's input (SPEC-005 §3.1). Shares are percentages and need no
 * entry; counts whose label names what they count ("Operarios por supervisor") get none. Money is per
 * month when the label or the section says so.
 */
export const PARAMETER_UNITS: Record<string, ParameterUnit> = {
  monthlyWage: 'money',
  basicWage: 'money',
  theoreticalWorkdaysPerYear: 'days',
  nonWorkedHolidaysPerYear: 'days',
  vacationWorkdaysPerYear: 'days',
  otherAbsenceDaysPerYear: 'days',
  hoursPerWorkday: 'hours',
  nationalHolidaysPerYear: 'days',
  supervisorMonthlyCost: 'money',
  baseEppPerFte: 'money',
  criticalEppPerFte: 'money',
  mopCoverageM2: 'squareMeters',
  mopCost: 'money',
  equipmentMonthly: 'money',
  transportMonthly: 'money',
  insuranceMonthly: 'money',
  flatRatePerM2: 'moneyPerM2',
  monthsPerYear: 'months',
  defaultDaysPerMonth: 'days',
  defaultMinutesPerFixture: 'minutes',
  defaultSolutionLitersPerFixture: 'liters',
  defaultPaperSoapPerFixtureMonthly: 'money',
};
