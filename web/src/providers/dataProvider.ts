import type { DataProvider } from 'react-admin';
import simpleRestProvider from 'ra-data-simple-rest';
import type { Stats } from '../types';
import { httpClient } from './httpClient';

export interface InventoryDataProvider extends DataProvider {
  getStats(): Promise<Stats>;
}

/** The off-the-shelf simple REST provider plus `getStats()` for the dashboard. */
export function createDataProvider(apiUrl: string): InventoryDataProvider {
  const base = simpleRestProvider(apiUrl, httpClient);
  return {
    ...base,
    async getStats() {
      const { json } = await httpClient(`${apiUrl}/stats`);
      return json as Stats;
    },
  };
}
