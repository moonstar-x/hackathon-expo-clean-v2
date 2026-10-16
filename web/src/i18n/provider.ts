import polyglotI18nProvider from 'ra-i18n-polyglot';
import { APP_LOCALE } from './locale';
import { spanishMessages } from './spanish';

export const i18nProvider = polyglotI18nProvider(
  () => spanishMessages,
  APP_LOCALE,
  [{ locale: APP_LOCALE, name: 'Español' }],
  { allowMissing: true },
);
