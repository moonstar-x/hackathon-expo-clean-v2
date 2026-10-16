import { useQuery, type QueryFunctionContext, type UseQueryResult } from '@tanstack/react-query';
import { useLogoutIfAccessDenied, type Identifier } from 'react-admin';
import { useAppConfig } from '../AppConfigContext';
import { readAuth } from '../providers/authStorage';
import { fetchMeasurementFile } from '../providers/measurementFiles';
import type { ScanGeometry } from '../types/geometry';
import { parseGeometry } from '../utils/geometry';

/**
 * A measurement's geometry, read and checked once and shared by the 3D and Medidas tabs. An error is a
 * GeometryError when the file can't be read or is too new, and the request's error otherwise.
 */
const useGeometry = (id: Identifier | undefined): UseQueryResult<ScanGeometry, Error> => {
  const { apiUrl } = useAppConfig();
  const logoutIfAccessDenied: ReturnType<typeof useLogoutIfAccessDenied> = useLogoutIfAccessDenied();
  return useQuery<ScanGeometry, Error>({
    queryKey: ['measurement-geometry', apiUrl, readAuth()?.userId, id],
    queryFn: async ({ signal }: QueryFunctionContext): Promise<ScanGeometry> => {
      if (id === undefined) throw new Error('No measurement to fetch a geometry for');
      let text: string;
      try {
        const response: Response = await fetchMeasurementFile(apiUrl, id, 'geometry', { signal });
        text = await response.text();
      } catch (error: unknown) {
        await logoutIfAccessDenied(error);
        throw error;
      }
      return parseGeometry(text);
    },
    enabled: id !== undefined,
    staleTime: Infinity,
    retry: false,
  });
};

export default useGeometry;
