// Types of the TDR documents (SPEC-009), as /api/tdr-documents sends them.
import type { RaRecord } from 'react-admin';

export type TdrStatus = 'pending' | 'running' | 'done' | 'failed';
export type InstallationType = 'privateHospital' | 'publicHospital' | 'office' | 'mall' | 'other';
export type Risk = 'critical' | 'semicritical' | 'noncritical';

export interface TdrZone {
  name: string;
  risk: Risk | null;
  zoneTypeId: number | null;
  scheduleId: number | null;
  floorArea: number | null;
  fixedPosts: number | null;
  hoursPerDay: number | null;
  daysPerMonth: number | null;
  notes: string | null;
}

/** What the model extracted and the admin reviews (SPEC-009 §4.1); every value may be null, text is Spanish. */
export interface TdrExtraction {
  title: string | null;
  summary: string | null;
  client: {
    legalName: string | null;
    taxId: string | null;
    contactName: string | null;
    contactTitle: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  city: string | null;
  installationType: InstallationType | null;
  referencePrice: number | null;
  contractMonths: number | null;
  paymentTerms: string | null;
  totalArea: number | null;
  serviceHours: string | null;
  zones: TdrZone[];
  staff: { role: string; count: number | null; notes: string | null }[];
  equipment: { description: string; quantity: number | null; notes: string | null }[];
  supplies: { description: string; presentation: string | null; quantity: number | null; frequency: string | null }[];
  requirements: { text: string }[];
}

export interface TdrDocument extends RaRecord {
  id: number;
  fileName: string;
  contentType: string;
  size: number;
  status: TdrStatus;
  /** Why the analysis failed, as a code (SPEC-009 §5.3). */
  error: string | null;
  errorDetail: string | null;
  attempts: number;
  model: string | null;
  title: string | null;
  zoneCount: number | null;
  quoteId: number | null;
  analyzedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Only on a single entry; null until analyzed. */
  extraction?: TdrExtraction | null;
}

export interface TdrStatusBadgeProps {
  status: TdrStatus;
  dense?: boolean;
}
