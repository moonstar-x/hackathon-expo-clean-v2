import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
import { lazy, Suspense, useEffect, useState } from 'react';
import { BulkDeleteButton, Datagrid, DateField, DateInput, DeleteButton, Edit, EditButton, FunctionField, List, Show, SimpleForm, TabbedShowLayout, TextField, TextInput, TopToolbar, maxLength, required, useLogoutIfAccessDenied, useNotify, useRecordContext } from 'react-admin';
import { useAppConfig } from '../AppConfigContext';
import type { Measurement, MeasurementFileKind } from '../types/api';
import { AuthenticatedImage } from './AuthenticatedImage';
import { downloadMeasurementFile, useMeasurementFile } from './files';
import { GeometryError, parseGeometry, type ScanGeometry } from './geometry';
import { area, categoryName, fileSize, length, roomType, size } from './format';
const ModelViewer = lazy(() => import('./ModelViewer'));
const filters = [<TextInput source="q" alwaysOn key="q" />, <TextInput source="createdBy" key="by" />, <DateInput source="scannedAt_gte" key="from" />, <DateInput source="scannedAt_lte" key="to" />];
export function MeasurementList() {
  return <List filters={filters} sort={{ field: 'createdAt', order: 'DESC' }}><Datagrid rowClick="show" bulkActionButtons={<BulkDeleteButton mutationMode="pessimistic" />}>
    <FunctionField label="Miniatura" render={(r: Measurement) => r.files.thumbnail ? <AuthenticatedImage id={r.id} kind="thumbnail" thumbnail /> : <ViewInArIcon />} />
    <TextField source="name" /><TextField source="roomCount" /><FunctionField source="totalFloorArea" render={(r: Measurement) => area(r.totalFloorArea, r.isAreaApproximate)} />
    <DateField source="scannedAt" showTime /><TextField source="createdBy" /><DateField source="createdAt" showTime />
  </Datagrid></List>;
}
export function MeasurementEdit() {
  return <Edit mutationMode="pessimistic" redirect="show"><SimpleForm><TextInput source="name" validate={[required(), maxLength(100)]} fullWidth /><TextInput source="notes" multiline fullWidth validate={maxLength(1000)} /></SimpleForm></Edit>;
}
function Actions() { return <TopToolbar><EditButton /><DeleteButton mutationMode="pessimistic" /></TopToolbar>; }
function Header() {
  const r = useRecordContext<Measurement>(); if (!r) return null;
  return <Box sx={{ p: 2 }}><Typography variant="h5">{r.name}</Typography><Typography>{area(r.totalFloorArea, r.isAreaApproximate)} · {r.roomCount} habitaciones · {new Date(r.scannedAt).toLocaleString('es')}</Typography><Typography variant="body2" color="text.secondary">Subido por {r.createdBy} el {new Date(r.createdAt).toLocaleString('es')}{r.deviceModel ? ` · ${r.deviceModel}` : ''}{r.appVersion ? ` · RoomScanner ${r.appVersion}` : ''}</Typography>{r.notes && <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{r.notes}</Typography>}{!r.isMerged && r.roomCount > 1 && <Alert severity="info" sx={{ mt: 1 }}>Las habitaciones no se pudieron unir, así que se muestran tal como se escanearon.</Alert>}</Box>;
}
function useGeometry(id: number) {
  const file = useMeasurementFile(id, 'geometry');
  const [state, setState] = useState<{ geometry?: ScanGeometry; error?: string }>({});
  useEffect(() => {
    let active = true;
    if (file.data) file.data.text().then((text) => { if (active) { try { setState({ geometry: parseGeometry(text) }); } catch (error) { setState({ error: error instanceof GeometryError ? error.message : 'No se pudo cargar la geometría.' }); } } }).catch(() => { if (active) setState({ error: 'No se pudo cargar la geometría.' }); });
    return () => { active = false; };
  }, [file.data]);
  return { ...state, error: file.error ? 'No se pudo cargar la geometría.' : state.error };
}
function Plan() { const r = useRecordContext<Measurement>(); return r ? <AuthenticatedImage id={r.id} kind="floorPlan" /> : null; }
function Model() {
  const r = useRecordContext<Measurement>(); return r ? <LoadedModel id={r.id} /> : null;
}
function LoadedModel({ id }: { id: number }) {
  const { geometry, error } = useGeometry(id);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!geometry) return <CircularProgress aria-label="Cargando geometría" />;
  return <Suspense fallback={<CircularProgress aria-label="Cargando vista 3D" />}><ModelViewer geometry={geometry} /></Suspense>;
}
function DetailsTable({ title, rows }: { title: string; rows: [string, string][] }) {
  return <Accordion><AccordionSummary>{title} ({rows.length})</AccordionSummary><AccordionDetails><Table size="small"><TableBody>{rows.map(([label, value], i) => <TableRow key={i}><TableCell>{label}</TableCell><TableCell>{value}</TableCell></TableRow>)}</TableBody></Table></AccordionDetails></Accordion>;
}
function Measures() {
  const r = useRecordContext<Measurement>(); return r ? <LoadedMeasures record={r} /> : null;
}
function LoadedMeasures({ record: r }: { record: Measurement }) {
  const { geometry, error } = useGeometry(r.id);
  return <Stack spacing={2}><Typography variant="h6">Resumen</Typography><Typography>{area(r.totalFloorArea, r.isAreaApproximate)} · {r.roomCount} habitaciones · {r.footprint ? size([r.footprint.width, r.footprint.length]) : '—'} · {new Date(r.scannedAt).toLocaleString('es')}</Typography>{(!geometry || error) && <Alert severity="info">Las medidas de cada habitación están disponibles. No se pudieron cargar los detalles de la geometría.</Alert>}{[...r.rooms].sort((a, b) => a.index - b.index).map((room) => {
    const g = geometry?.rooms.find((v) => v.id.toLowerCase() === room.id.toLowerCase());
    return <Card key={room.id} variant="outlined"><CardContent><Typography variant="h6">{room.name} · {roomType(room.type)}</Typography><Typography>Superficie: {area(room.floorArea, room.isFloorApproximate)} · Perímetro: {length(room.perimeter)} · Altura del techo: {length(room.ceilingHeight)}</Typography>{g && <Box sx={{ mt: 2 }}><DetailsTable title="Paredes" rows={g.walls.map((w, i) => [`Pared ${i + 1}`, size(w.dimensions.slice(0, 2))])} /><DetailsTable title="Puertas" rows={g.doors.map((w, i) => [`Puerta ${i + 1}${w.isOpen ? ' · abierta' : ''}`, size(w.dimensions.slice(0, 2))])} /><DetailsTable title="Ventanas" rows={g.windows.map((w, i) => [`Ventana ${i + 1}`, size(w.dimensions.slice(0, 2))])} /><DetailsTable title="Aberturas" rows={g.openings.map((w, i) => [`Abertura ${i + 1}`, size(w.dimensions.slice(0, 2))])} /><DetailsTable title="Objetos" rows={g.objects.map((o) => [categoryName(o.category), size([o.dimensions[0], o.dimensions[2], o.dimensions[1]])])} /></Box>}</CardContent></Card>;
  })}</Stack>;
}
const fileLabels: Record<MeasurementFileKind, string> = { floorPlan: 'Plano (PNG)', thumbnail: 'Miniatura (PNG)', geometry: 'Geometría (JSON)', model: 'Modelo 3D (USDZ)', csv: 'Medidas (CSV)', raw: 'Datos de RoomPlan (JSON)' };
function Files() {
  const r = useRecordContext<Measurement>(), { apiUrl } = useAppConfig(), logout = useLogoutIfAccessDenied(), notify = useNotify();
  if (!r) return null;
  return <Table><TableBody>{(Object.keys(fileLabels) as MeasurementFileKind[]).filter((kind) => r.files[kind]).map((kind) => <TableRow key={kind}><TableCell>{fileLabels[kind]}{kind === 'model' && <Typography variant="caption" display="block">Se abre con Vista rápida en iPhone, iPad y Mac.</Typography>}</TableCell><TableCell>{fileSize(r.files[kind]!.size)}</TableCell><TableCell><Button onClick={async () => { try { await downloadMeasurementFile(apiUrl, r.id, kind); } catch (error) { await logout(error); notify(error instanceof Error ? error.message : 'No se pudo descargar el archivo.', { type: 'error' }); } }}>Descargar</Button></TableCell></TableRow>)}</TableBody></Table>;
}
export function MeasurementShow() {
  return <Show actions={<Actions />}><Header /><TabbedShowLayout><TabbedShowLayout.Tab label="Plano"><Plan /></TabbedShowLayout.Tab><TabbedShowLayout.Tab label="3D" path="model"><Model /></TabbedShowLayout.Tab><TabbedShowLayout.Tab label="Medidas" path="measures"><Measures /></TabbedShowLayout.Tab><TabbedShowLayout.Tab label="Archivos" path="files"><Files /></TabbedShowLayout.Tab></TabbedShowLayout></Show>;
}
