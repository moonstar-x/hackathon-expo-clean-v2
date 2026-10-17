import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryFunctionContext,
  type QueryKey,
} from '@tanstack/react-query';
import { useLogoutIfAccessDenied } from 'react-admin';
import { useAppConfig } from '../AppConfigContext';
import { readAuth } from '../providers/authStorage';
import { fetchCompanyLogo, removeCompanyLogo, uploadCompanyLogo } from '../providers/companyLogo';
import type { CompanyLogo } from '../types/quoteDocuments';

/**
 * The company logo as a Blob (null while there is none), fetched once per account, with saving and
 * removing it. Both write the result straight into the query, so every view of the logo follows
 * without another download. A 401 signs out like any other request.
 */
const useCompanyLogo = (): CompanyLogo => {
  const { apiUrl } = useAppConfig();
  const client: QueryClient = useQueryClient();
  const logoutIfAccessDenied: ReturnType<typeof useLogoutIfAccessDenied> = useLogoutIfAccessDenied();
  const queryKey: QueryKey = ['company-logo', apiUrl, readAuth()?.userId];
  const signOutIfDenied = async <T>(request: () => Promise<T>): Promise<T> => {
    try {
      return await request();
    } catch (error: unknown) {
      await logoutIfAccessDenied(error);
      throw error;
    }
  };
  const logo: CompanyLogo['logo'] = useQuery<Blob | null, Error>({
    queryKey,
    queryFn: ({ signal }: QueryFunctionContext): Promise<Blob | null> => signOutIfDenied((): Promise<Blob | null> => fetchCompanyLogo(apiUrl, signal)),
    staleTime: Infinity,
    retry: false,
  });
  const upload: CompanyLogo['upload'] = useMutation<Blob, Error, Blob>({
    mutationFn: async (file: Blob): Promise<Blob> => {
      await signOutIfDenied((): Promise<unknown> => uploadCompanyLogo(apiUrl, file));
      return file;
    },
    onSuccess: (file: Blob): void => {
      client.setQueryData(queryKey, file);
    },
  });
  const remove: CompanyLogo['remove'] = useMutation<void, Error, void>({
    mutationFn: (): Promise<void> => signOutIfDenied((): Promise<void> => removeCompanyLogo(apiUrl)),
    onSuccess: (): void => {
      client.setQueryData(queryKey, null);
    },
  });
  return { logo, upload, remove };
};

export default useCompanyLogo;
