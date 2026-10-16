import { useQuery, type QueryFunctionContext, type UseQueryResult } from '@tanstack/react-query';
import { useLogoutIfAccessDenied, type Identifier } from 'react-admin';
import { useAppConfig } from '../AppConfigContext';
import { readAuth } from '../providers/authStorage';
import { fetchMeasurementFile } from '../providers/measurementFiles';
import type { MeasurementFileKind } from '../types/api';

/**
 * A measurement's file as a Blob, such as the floor plan. Fetched once per account and kept: files
 * never change after upload (SPEC-004 §4.5). A 401 signs out like any other request.
 */
const useMeasurementFile = (
  id: Identifier | undefined,
  kind: MeasurementFileKind,
  enabled: boolean = true,
): UseQueryResult<Blob, Error> => {
  const { apiUrl } = useAppConfig();
  const logoutIfAccessDenied: ReturnType<typeof useLogoutIfAccessDenied> = useLogoutIfAccessDenied();
  return useQuery<Blob, Error>({
    queryKey: ['measurement-file', apiUrl, readAuth()?.userId, id, kind],
    queryFn: async ({ signal }: QueryFunctionContext): Promise<Blob> => {
      if (id === undefined) throw new Error('No measurement to fetch a file for');
      try {
        const response: Response = await fetchMeasurementFile(apiUrl, id, kind, { signal });
        return await response.blob();
      } catch (error: unknown) {
        await logoutIfAccessDenied(error);
        throw error;
      }
    },
    enabled: enabled && id !== undefined,
    staleTime: Infinity,
    retry: false,
  });
};

export default useMeasurementFile;
