import type { SortPayload } from 'react-admin';
import type { Tone } from '../types/list';
import type { TdrStatus } from '../types/tdr';

/** Newest uploads first, as the API sorts them by default (SPEC-009 §5.1). */
export const TDR_SORT: SortPayload = { field: 'createdAt', order: 'DESC' };
export const TDR_PER_PAGE: number = 25;
export const TDR_SORT_FIELDS: string[] = ['createdAt', 'fileName', 'status'];

/** What the upload accepts: a PDF or a Word .docx, up to 20 MB (SPEC-009 §5.2). */
export const TDR_ACCEPT: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};
export const TDR_MAX_BYTES: number = 20 * 1024 * 1024;

/** How often a page with an entry being analyzed asks again, in ms. */
export const TDR_POLL_MS: number = 2000;
/** States the analysis is still working in. */
export const TDR_BUSY: ReadonlySet<TdrStatus> = new Set<TdrStatus>(['pending', 'running']);

export const TDR_STATUS_TONE: Record<TdrStatus, Tone | undefined> = {
  pending: undefined,
  running: 'blue',
  done: 'green',
  failed: 'red',
};

/** The form's choices, translated under app.tdr.enums. */
export const INSTALLATION_TYPES: string[] = ['publicHospital', 'privateHospital', 'office', 'mall', 'other'];
export const RISKS: string[] = ['critical', 'semicritical', 'noncritical'];

/** How the empty list teaches the feature. */
export const TDR_EMPTY_STEPS: string[] = ['app.empty.tdr-documents.steps.upload', 'app.empty.tdr-documents.steps.review', 'app.empty.tdr-documents.steps.quote'];
