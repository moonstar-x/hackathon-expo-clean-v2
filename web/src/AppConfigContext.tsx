import { createContext, useContext } from 'react';
import type { AppConfig } from './config';

export const AppConfigContext = createContext<AppConfig | null>(null);

export function useAppConfig(): AppConfig {
  const config = useContext(AppConfigContext);
  if (!config) throw new Error('useAppConfig must be used inside <AppConfigContext.Provider>');
  return config;
}
