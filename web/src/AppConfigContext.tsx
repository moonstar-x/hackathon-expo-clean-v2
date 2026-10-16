import { createContext, useContext, type Context } from 'react';
import type { AppConfig } from './types/config';

export const AppConfigContext: Context<AppConfig | null> = createContext<AppConfig | null>(null);

/** The validated build-time configuration (API URL, title, currency). */
export const useAppConfig = (): AppConfig => {
  const config: AppConfig | null = useContext(AppConfigContext);
  if (!config) throw new Error('useAppConfig must be used inside <AppConfigContext.Provider>');
  return config;
};
