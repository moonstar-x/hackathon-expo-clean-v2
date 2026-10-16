import simpleRestProvider from 'ra-data-simple-rest';
import type { DataProvider } from 'react-admin';
import type { Stats } from '../types/api';
import type { HttpResponse, InventoryDataProvider } from '../types/providers';
import { httpClient } from './httpClient';

/** The off-the-shelf simple REST provider plus `getStats()` for the dashboard. */
export const createDataProvider = (apiUrl: string): InventoryDataProvider => {
  const base: DataProvider = simpleRestProvider(apiUrl, httpClient);
  return {
    ...base,
    getStats: async (): Promise<Stats> => {
      const { json }: HttpResponse<unknown> = await httpClient(`${apiUrl}/stats`);
      return json as Stats;
    },
  };
};
