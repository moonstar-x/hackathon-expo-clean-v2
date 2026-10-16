import polyglotI18nProvider from 'ra-i18n-polyglot';
import { mergeTranslations, type I18nProvider, type TranslationMessages } from 'react-admin';
import { APP_LOCALE } from '../constants/app';
import appSpanish from './es';
import raSpanish from './ra-es';

// react-admin's own messages, then the app's: field labels under resources.* and the rest under app.*.
export const messages: TranslationMessages = mergeTranslations(raSpanish, appSpanish) as TranslationMessages;

export const i18nProvider: I18nProvider = polyglotI18nProvider(
  (): TranslationMessages => messages,
  APP_LOCALE,
  [{ locale: APP_LOCALE, name: 'Español' }],
  { allowMissing: true },
);
