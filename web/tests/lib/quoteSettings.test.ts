import { describe, expect, it } from 'vitest';
import { PARAMETER_TABS, PARAMETER_UNITS } from '../../src/constants/quoteSettings';
import { i18nProvider } from '../../src/i18n';
import { parameterFields, type ParameterField } from '../../src/quotes/parameterFields';
import type { ParameterSection, ParameterTab } from '../../src/types/quotes';
import { currencySymbol } from '../../src/utils/format';
import { cleaningFrequency, formatDose, sourceNote } from '../../src/utils/quotes';

/** The translation, or the key itself when it is missing. */
const message = (key: string): string => i18nProvider.translate(key);

describe('parameter tabs', () => {
  it('hold every parameter once, in the order the quote lists them', (): void => {
    const names: string[] = PARAMETER_TABS.flatMap((tab: ParameterTab): string[] =>
      tab.sections.flatMap((section: ParameterSection): string[] => section.fields.map((field: ParameterField): string => field.name)),
    );
    expect(names).toEqual(parameterFields.map((field: ParameterField): string => field.name));
  });

  it('give every section a hint, and a title when it shares its tab', (): void => {
    for (const tab of PARAMETER_TABS) {
      for (const section of tab.sections) {
        const hint: string = `app.quoteSettings.parameterHints.${section.id}`;
        const title: string = `app.quoteSettings.parameterSections.${section.id}`;
        expect(message(hint)).not.toBe(hint);
        if (tab.sections.length > 1) expect(message(title)).not.toBe(title);
      }
    }
  });

  it('give units only to numbers that are not shares', (): void => {
    for (const name of Object.keys(PARAMETER_UNITS)) {
      const field: ParameterField | undefined = parameterFields.find((candidate: ParameterField): boolean => candidate.name === name);
      expect(field && !field.percentage && !field.boolean, name).toBe(true);
    }
  });
});

describe('parameter sources', () => {
  it('drop the label a note repeats', (): void => {
    expect(sourceNote('Fondo de reserva. Origen: D10.', 'Fondo de reserva')).toBe('Origen: D10.');
  });

  it('show nothing for a source that is only a dash', (): void => {
    expect(sourceNote('Tráfico predeterminado. Origen: —.', 'Tráfico predeterminado')).toBeUndefined();
    expect(sourceNote(undefined, 'Fondo de reserva')).toBeUndefined();
  });

  it('keep a note that says something else', (): void => {
    expect(sourceNote('Revisado con contabilidad en octubre.', 'Fondo de reserva')).toBe(
      'Revisado con contabilidad en octubre.',
    );
  });
});

describe('technical offer wording', () => {
  it('words the frequency as SPEC-005 §5.9 does and measures doses to a tenth', (): void => {
    expect(cleaningFrequency(4, 3)).toBe('Cada 4 h · 3 por día');
    expect(formatDose(24, 'ml')).toBe('24 ml');
    expect(formatDose(2.46, 'g')).toBe('2,5 g');
  });

  it('writes US dollars as Spanish formatting does', (): void => {
    expect(currencySymbol('USD')).toBe('US$');
  });
});
