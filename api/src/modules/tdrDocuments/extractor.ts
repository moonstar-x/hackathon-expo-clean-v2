import mammoth from 'mammoth';
import { extractionJsonSchema, normalizeExtraction, PDF_TYPE, type TdrCatalog, type TdrContentType, type TdrExtraction } from './schemas.ts';

// Reads a TDR document with Claude Haiku through OpenRouter (SPEC-009 §4.2).

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TIMEOUT_MS = 180_000;
const MAX_TOKENS = 16_000;
/** A Word document's text beyond this is left out; a TDR is far shorter. */
const MAX_TEXT_CHARS = 400_000;
const TOOL_NAME = 'registrar_tdr';

/** Why an analysis failed: a code the admin translates (SPEC-009 §5.3), and whether trying again may help. */
export class TdrError extends Error {
  code: string;
  retryable: boolean;
  constructor(code: string, detail: string, retryable = false) {
    super(detail);
    this.name = 'TdrError';
    this.code = code;
    this.retryable = retryable;
  }
}

export interface ExtractInput {
  file: Buffer;
  fileName: string;
  contentType: TdrContentType;
  catalog: TdrCatalog;
}
export interface ExtractOptions {
  apiKey: string | null;
  model: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}
export type Extractor = (input: ExtractInput, options: ExtractOptions) => Promise<TdrExtraction>;

export const SYSTEM_PROMPT = `Eres analista comercial de una empresa de limpieza y desinfección en Ecuador. Lees términos de referencia (TDR), fichas técnicas y pliegos de contratación de servicios de limpieza y extraes la información que se necesita para cotizarlos.

Reglas:
- Extrae solo lo que el documento dice. Si un dato no está, usa null (o una lista vacía). Nunca inventes cantidades, áreas, precios ni nombres.
- Escribe todo el texto en español, aunque el documento esté en inglés: tradúcelo.
- Los números van como números, sin separadores de miles ni símbolos: 93.507,74 dólares es 93507.74.
- Zonas: una fila por cada área o línea de puestos del documento (por ejemplo, la tabla de personal por área). Si un área tiene puestos de 24 horas y de 8 horas, son dos filas con el mismo nombre. Si el documento solo da una superficie total y no áreas, deja las zonas vacías.
- Días de servicio al mes (daysPerMonth): salen de la jornada general del documento aunque la tabla de áreas no los repita. Un servicio de todos los días o de 365 días al año es 30.4 en todas sus zonas.
- Para zoneTypeId elige del catálogo de tipos de zona de la empresa el que mejor corresponde por nombre y riesgo; si ninguno corresponde, null.
- El resumen es breve y útil para quien cotiza: alcance, áreas, jornada, personal, insumos y condiciones clave.`;

/** The user message: the catalog to choose zone types from, then the document itself. */
async function documentContent({ file, fileName, contentType, catalog }: ExtractInput) {
  const types = catalog.zoneTypes.length
    ? catalog.zoneTypes.map((t) => `${t.id} · ${t.name} · ${t.risk}`).join('\n')
    : '(la empresa no tiene tipos de zona activos: usa null)';
  const intro = { type: 'text', text: `Catálogo de tipos de zona de la empresa (id · nombre · riesgo):\n${types}\n\nExtrae la información del documento «${fileName}».` };
  if (contentType === PDF_TYPE) {
    return [intro, { type: 'file', file: { filename: fileName, file_data: `data:${PDF_TYPE};base64,${file.toString('base64')}` } }];
  }
  let text: string;
  try {
    text = (await mammoth.extractRawText({ buffer: file })).value;
  } catch (err) {
    throw new TdrError('UNREADABLE_DOCUMENT', `Could not read the Word document: ${err instanceof Error ? err.message : String(err)}`);
  }
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  if (!text) throw new TdrError('EMPTY_DOCUMENT', 'The Word document has no text');
  return [intro, { type: 'text', text: `Contenido del documento:\n\n${text.slice(0, MAX_TEXT_CHARS)}` }];
}

/** The request body sent to OpenRouter; exported for tests. */
export async function requestBody(input: ExtractInput, model: string) {
  return {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: await documentContent(input) },
    ],
    // A forced tool call rather than strict structured output: Anthropic's strict mode allows at most 16
    // nullable fields, and a TDR has far more. The reply is validated and normalized all the same.
    tools: [{ type: 'function', function: { name: TOOL_NAME, description: 'Registra la información extraída del documento TDR.', parameters: extractionJsonSchema } }],
    tool_choice: { type: 'function', function: { name: TOOL_NAME } },
    // The model reads the PDF itself (pages as text and images), never a paid OCR fallback.
    plugins: [{ id: 'file-parser', pdf: { engine: 'native' } }],
    max_tokens: MAX_TOKENS,
  };
}

/** The JSON object in a reply, also when it comes in a fenced block or with words around it. */
export function parseReply(content: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(content)?.[1];
  for (const candidate of [content, fenced, content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1)]) {
    if (!candidate?.trim()) continue;
    try {
      const value: unknown = JSON.parse(candidate);
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) return value;
    } catch { /* try the next one */ }
  }
  throw new TdrError('INVALID_RESPONSE', 'The model did not answer with a JSON object', true);
}

function httpError(status: number, detail: string): TdrError {
  if (status === 401 || status === 403) return new TdrError('OPENROUTER_AUTH', detail);
  if (status === 402) return new TdrError('OPENROUTER_CREDITS', detail);
  if (status === 408 || status === 429 || status >= 500) return new TdrError('OPENROUTER_UNAVAILABLE', detail, true);
  return new TdrError('OPENROUTER_REJECTED', detail);
}

interface CompletionBody {
  error?: { code?: number | string; message?: string };
  choices?: { finish_reason?: string | null; message?: { content?: string | null; tool_calls?: { function?: { name?: string; arguments?: string } }[] } }[];
}

export const extractTdr: Extractor = async (input, { apiKey, model, fetch: fetchImpl = fetch, timeoutMs = TIMEOUT_MS }) => {
  if (!apiKey) throw new TdrError('OPENROUTER_API_KEY_MISSING', 'OPENROUTER_API_KEY is not set');
  const body = JSON.stringify(await requestBody(input, model));
  let response: Response;
  try {
    response = await fetchImpl(OPENROUTER_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'CleanCode' },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new TdrError('OPENROUTER_UNAVAILABLE', err instanceof Error ? err.message : 'Request failed', true);
  }
  let raw: string;
  try {
    raw = await response.text();
  } catch (err) {
    // The timeout can also fire while the answer is still arriving.
    throw new TdrError('OPENROUTER_UNAVAILABLE', err instanceof Error ? err.message : 'Reading the reply failed', true);
  }
  let json: CompletionBody = {};
  // OpenRouter may send blank keep-alive lines before the JSON.
  try { json = JSON.parse(raw.trim()) as CompletionBody; } catch { /* reported below */ }
  if (!response.ok) throw httpError(response.status, json.error?.message ?? raw.slice(0, 500));
  // OpenRouter can answer 200 with an error from the provider.
  if (json.error) throw httpError(typeof json.error.code === 'number' ? json.error.code : 502, json.error.message ?? 'Provider error');
  const choice = json.choices?.[0];
  if (choice?.finish_reason === 'length') throw new TdrError('INVALID_RESPONSE', 'The reply was cut at the token limit', true);
  // The tool call's arguments; a model that answered in text instead still counts if it is the JSON.
  const content = choice?.message?.tool_calls?.find((call) => call.function?.name === TOOL_NAME)?.function?.arguments ?? choice?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new TdrError('INVALID_RESPONSE', 'The reply has no content', true);
  return normalizeExtraction(parseReply(content), input.catalog);
};
