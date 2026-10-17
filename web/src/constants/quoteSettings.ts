import type { SortPayload } from 'react-admin';
import { quoteFields, quoteText } from '../i18n/quotes';
import type { CatalogField, CatalogSection } from '../types/quotes';

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

/** The quoting parameters by group: the group's title, then the slice of parameterFields it holds. */
export const PARAMETER_GROUPS: [string, number, number][] = [
  [quoteText.payrollGroup, 0, 15],
  [quoteText.supervisionGroup, 15, 22],
  [quoteText.fixedGroup, 22, 27],
  [quoteText.marginGroup, 27, 31],
  [quoteText.chemicalsGroup, 31, 33],
  [quoteText.comparisonGroup, 33, 35],
  [quoteText.defaultsGroup, 35, 39],
  [quoteText.fixturesGroup, 39, 44],
];
