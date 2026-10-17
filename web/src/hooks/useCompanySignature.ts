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
import { fetchCompanySignature, removeCompanySignature, uploadCompanySignature } from '../providers/companySignature';
import type { CompanySignature, SignatureInfo, SignatureUpload } from '../types/quoteDocuments';

/**
 * The company's electronic signature (its certificate's details, null while there is none), with loading
 * and removing it. Both write the result straight into the query, as the logo's do. A 401 signs out like
 * any other request.
 */
const useCompanySignature = (): CompanySignature => {
  const { apiUrl } = useAppConfig();
  const client: QueryClient = useQueryClient();
  const logoutIfAccessDenied: ReturnType<typeof useLogoutIfAccessDenied> = useLogoutIfAccessDenied();
  const queryKey: QueryKey = ['company-signature', apiUrl, readAuth()?.userId];
  const signOutIfDenied = async <T>(request: () => Promise<T>): Promise<T> => {
    try {
      return await request();
    } catch (error: unknown) {
      await logoutIfAccessDenied(error);
      throw error;
    }
  };
  const signature: CompanySignature['signature'] = useQuery<SignatureInfo | null, Error>({
    queryKey,
    queryFn: ({ signal }: QueryFunctionContext): Promise<SignatureInfo | null> => signOutIfDenied((): Promise<SignatureInfo | null> => fetchCompanySignature(apiUrl, signal)),
    retry: false,
  });
  const upload: CompanySignature['upload'] = useMutation<SignatureInfo, Error, SignatureUpload>({
    mutationFn: ({ file, password }: SignatureUpload): Promise<SignatureInfo> => signOutIfDenied((): Promise<SignatureInfo> => uploadCompanySignature(apiUrl, file, password)),
    onSuccess: (info: SignatureInfo): void => {
      client.setQueryData(queryKey, info);
    },
  });
  const remove: CompanySignature['remove'] = useMutation<void, Error, void>({
    mutationFn: (): Promise<void> => signOutIfDenied((): Promise<void> => removeCompanySignature(apiUrl)),
    onSuccess: (): void => {
      client.setQueryData(queryKey, null);
    },
  });
  return { signature, upload, remove };
};

export default useCompanySignature;
