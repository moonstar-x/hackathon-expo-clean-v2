import { useState, type CSSProperties, type ReactElement, type SyntheticEvent } from 'react';
import { Alert, Box, Button, Skeleton, Tab, Tabs } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type ExcelJS from 'exceljs';
import { documentText } from '../i18n/quoteDocuments';
import { formatCell } from './formatCell';

const pixels = (width: number | undefined): number => (width ?? 12) * 7 + 5;
const rgb = (color: Partial<ExcelJS.Color> | undefined): string | undefined => color?.argb ? `#${color.argb.slice(-6)}` : undefined;
function cellStyle(cell: ExcelJS.Cell): CSSProperties {
  const fill: ExcelJS.Fill = cell.fill;
  const borders: Partial<ExcelJS.Borders> = cell.border ?? {};
  const border = (v: Partial<ExcelJS.Border> | undefined): string | undefined => v?.style ? `${v.style === 'medium' ? 2 : 1}px solid ${rgb(v.color) ?? '#0F172A'}` : undefined;
  return { fontFamily: cell.font?.name ?? 'Arial', fontSize: `${cell.font?.size ?? 10}pt`, fontWeight: cell.font?.bold ? 'bold' : 'normal', fontStyle: cell.font?.italic ? 'italic' : 'normal', color: rgb(cell.font?.color) ?? '#0F172A', background: fill?.type === 'pattern' ? rgb(fill.fgColor) : undefined, textAlign: cell.alignment?.horizontal === 'centerContinuous' || cell.alignment?.horizontal === 'distributed' || cell.alignment?.horizontal === 'fill' ? 'left' : cell.alignment?.horizontal ?? (typeof cell.value === 'number' ? 'right' : 'left'), verticalAlign: cell.alignment?.vertical === 'middle' ? 'middle' : cell.alignment?.vertical === 'bottom' ? 'bottom' : 'top', whiteSpace: cell.alignment?.wrapText ? 'pre-wrap' : 'nowrap', overflowWrap: 'anywhere', padding: '4px 6px', borderTop: border(borders.top), borderBottom: border(borders.bottom), borderLeft: border(borders.left), borderRight: border(borders.right) };
}
interface Merge { start: string; rows: number; cols: number }
function address(value: string): { col: number; row: number } {
  const match: RegExpExecArray | null = /^([A-Z]+)(\d+)$/.exec(value);
  if (!match) throw new Error('Rango de Excel no válido');
  return { col: [...match[1]].reduce((n: number, c: string): number => n * 26 + c.charCodeAt(0) - 64, 0), row: Number(match[2]) };
}
const merge = (range: string): Merge => {
  const [first, last]: string[] = range.split(':');
  const a: ReturnType<typeof address> = address(first), b: ReturnType<typeof address> = address(last ?? first);
  return { start: first, rows: b.row - a.row + 1, cols: b.col - a.col + 1 };
};
function mediaUrl(image: ExcelJS.Image): string {
  if (image.base64) return image.base64.startsWith('data:') ? image.base64 : `data:image/${image.extension};base64,${image.base64}`;
  const bytes: Uint8Array = new Uint8Array(image.buffer as unknown as ArrayBuffer);
  let binary: string = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/${image.extension};base64,${btoa(binary)}`;
}
function Sheet({ sheet, book }: { sheet: ExcelJS.Worksheet; book: ExcelJS.Workbook }): ReactElement {
  const merges: Merge[] = sheet.model.merges.map(merge);
  const rows: ExcelJS.Row[] = Array.from({ length: sheet.rowCount }, (_: unknown, i: number): ExcelJS.Row => sheet.getRow(i + 1));
  return <Box sx={{ overflow: 'auto', maxWidth: '100%', bgcolor: '#e2e8f0', p: 2, minHeight: '70vh' }}><Box sx={{ bgcolor: 'white', color: '#0F172A', width: 'max-content', position: 'relative', p: 2 }}>
    <table aria-label={sheet.name} style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: sheet.columns.reduce((sum: number, col: Partial<ExcelJS.Column>): number => sum + pixels(col.width), 0) }}><colgroup>{sheet.columns.map((col: Partial<ExcelJS.Column>, i: number): ReactElement => <col key={i} style={{ width: pixels(col.width) }} />)}</colgroup><tbody>{rows.map((row: ExcelJS.Row): ReactElement => <tr key={row.number} style={{ height: (row.height ?? 15) * 4 / 3 }}>{Array.from({ length: sheet.columnCount }, (_: unknown, i: number): ReactElement | null => {
      const cell: ExcelJS.Cell = row.getCell(i + 1);
      if (cell.isMerged && cell.master.address !== cell.address) return null;
      const merged: Merge | undefined = merges.find((m: Merge): boolean => m.start === cell.address);
      return <td key={i} colSpan={merged?.cols} rowSpan={merged?.rows} style={cellStyle(cell)}>{formatCell(cell.value, cell.numFmt)}</td>;
    })}</tr>)}</tbody></table>
    {sheet.getImages().map((placement: ReturnType<ExcelJS.Worksheet['getImages']>[number]): ReactElement => {
      const range: ExcelJS.ImageRange = placement.range;
      const col: number = range.tl.nativeCol, row: number = range.tl.nativeRow;
      const left: number = sheet.columns.slice(0, col).reduce((sum: number, c: Partial<ExcelJS.Column>): number => sum + pixels(c.width), 16);
      const top: number = rows.slice(0, row).reduce((sum: number, r: ExcelJS.Row): number => sum + (r.height ?? 15) * 4 / 3, 16);
      const extent: { width: number; height: number } = (range as ExcelJS.ImageRange & { ext?: { width: number; height: number } }).ext ?? { width: 208, height: 55 };
      return <img key={placement.imageId} alt="Logo CleanCode" src={mediaUrl(book.getImage(Number(placement.imageId)))} style={{ position: 'absolute', left, top, width: extent.width, height: extent.height }} />;
    })}
  </Box></Box>;
}
export function XlsxPreview({ blob, contentHash }: { blob: Blob; contentHash: string }): ReactElement {
  const [selected, setSelected]: [number, (v: number) => void] = useState(0);
  const query: ReturnType<typeof useQuery<ExcelJS.Workbook>> = useQuery({ queryKey: ['xlsx-preview', contentHash], queryFn: async (): Promise<ExcelJS.Workbook> => {
    const module: { default: typeof import('exceljs') } = await import('exceljs');
    const book: ExcelJS.Workbook = new module.default.Workbook();
    const bytes: ArrayBuffer = await blob.arrayBuffer();
    await book.xlsx.load(bytes); return book;
  }, retry: false, gcTime: 0 });
  if (query.isPending) return <Skeleton variant="rectangular" height="70vh" />;
  if (!query.data) return <Alert severity="error">{documentText.failed}<Button onClick={(): void => { void query.refetch(); }}>{documentText.retry}</Button></Alert>;
  const book: ExcelJS.Workbook = query.data;
  const sheet: ExcelJS.Worksheet = book.worksheets[selected] ?? book.worksheets[0];
  return <Box sx={{ minWidth: 0 }}><Tabs value={selected} onChange={(_e: SyntheticEvent, v: number): void => setSelected(v)}>{book.worksheets.map((s: ExcelJS.Worksheet): ReactElement => <Tab label={s.name} key={s.id} />)}</Tabs><Sheet sheet={sheet} book={book} /></Box>;
}
