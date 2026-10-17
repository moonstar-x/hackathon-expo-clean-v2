import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import type { ResourceProps } from 'react-admin';
import TdrCreate from './TdrCreate';
import TdrEdit from './TdrEdit';
import TdrList from './TdrList';

// No show: an entry opens as its review form (SPEC-009 §6).
const tdrDocuments: Omit<ResourceProps, 'name'> = {
  list: TdrList,
  create: TdrCreate,
  edit: TdrEdit,
  icon: DocumentScannerIcon,
  recordRepresentation: (doc: { title: string | null; fileName: string }): string => doc.title ?? doc.fileName,
};

export default tdrDocuments;
