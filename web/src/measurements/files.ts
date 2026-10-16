import { useQuery } from '@tanstack/react-query';
import { HttpError, useLogoutIfAccessDenied } from 'react-admin';
import { useAppConfig } from '../AppConfigContext';
import { readAuth } from '../providers/authStorage';
import { translateApiError } from '../i18n/apiErrors';
import type { MeasurementFileKind } from '../types/api';
export function fileUrl(apiUrl: string, id: number, kind: MeasurementFileKind) { return `${apiUrl.replace(/\/+$/, '')}/measurements/${id}/files/${kind}`; }
export async function fetchMeasurementFile(apiUrl: string, id: number, kind: MeasurementFileKind, download = false, signal?: AbortSignal) {
  const token = readAuth()?.token;
  const response = await fetch(`${fileUrl(apiUrl, id, kind)}${download ? '?download=1' : ''}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new HttpError(translateApiError(body.message, body.code), response.status, body);
  }
  return response;
}
export function useMeasurementFile(id: number, kind: MeasurementFileKind, enabled = true) {
  const { apiUrl } = useAppConfig();
  const logout = useLogoutIfAccessDenied();
  const query = useQuery({ queryKey: ['measurement-file', apiUrl, readAuth()?.userId, id, kind], enabled, staleTime: Infinity, retry: false, queryFn: async ({ signal }) => {
    try { return await (await fetchMeasurementFile(apiUrl, id, kind, false, signal)).blob(); }
    catch (error) { await logout(error); throw error; }
  } });
  return query;
}
export function downloadName(disposition: string | null, fallback: string): string {
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition ?? '');
  if (utf8) { try { return decodeURIComponent(utf8[1]); } catch { /* Use the plain name. */ } }
  return /filename="([^"]+)"/i.exec(disposition ?? '')?.[1] ?? fallback;
}
export async function downloadMeasurementFile(apiUrl: string, id: number, kind: MeasurementFileKind) {
  const response = await fetchMeasurementFile(apiUrl, id, kind, true);
  const blob = await response.blob(), url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a'); link.href = url; link.download = downloadName(response.headers.get('Content-Disposition'), `medicion-${id}-${kind}`); document.body.append(link); link.click(); link.remove();
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
