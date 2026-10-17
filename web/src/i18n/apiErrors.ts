import { REQUEST_FAILED_MESSAGE } from '../constants/http';
import { formatQuantity } from '../utils/format';

const messages: Record<string, string> = {
  'The quote document is not ready': 'Falta información para generar la cotización.',
  'The quote changed after the preview': 'La cotización cambió. Revisa la vista previa actualizada.',
  'Must be a valid phone': 'Debe ser un teléfono válido.',
  'Must be exactly 13 digits': 'Debe tener exactamente 13 dígitos.',
  'Must be a valid identification': 'Debe ser una identificación válida.',
  'Must be less than or equal to the target margin':'Debe ser menor o igual al margen objetivo.',
  'Inventory unit is not compatible':'La unidad del inventario no es compatible.',
  'Zone type is in use':'El tipo de zona está en uso. Puedes desactivarlo.',
  'Schedule is in use':'El horario está en uso. Puedes desactivarlo.',
  'Quoting product is in use':'El producto de cotización está en uso. Puedes desactivarlo.',
  'Must be active':'Debe estar activo.',
  'Does not exist':'El registro no existe.',
  'A quoting record with this name or code already exists':'Ya existe un registro con este nombre o código.',
  'The measurement no longer exists':'La medición ya no existe.',
  'A quote already exists':'Ya existe una cotización creada a partir de este registro.',
  'Must be a PDF or Word (.docx) file': 'Debe ser un PDF o un documento de Word (.docx).',
  'Must be at most 20 MB': 'El archivo debe pesar como máximo 20 MB.',
  'Invalid multipart body: send one "file"': 'Envía un solo archivo.',
  'Malformed multipart body': 'El formulario de archivos no es válido.',
  'The document has not been analyzed yet': 'El documento todavía no se ha analizado.',
  'The document is already being analyzed': 'El documento ya se está analizando.',
  'Add at least one zone': 'Agrega al menos una zona para crear la cotización.',
  'File not found': 'No se encontró el archivo.',
  'The quote has no results yet':'La cotización aún no tiene resultados.',
  'Zone does not belong to this quote':'La zona no pertenece a esta cotización.',
  'Product is not in the purchase plan':'El producto no está en el plan de compras.',
  'Invalid period; expected YYYY-MM':'El período debe ser un mes válido (AAAA-MM).',
  'Must be an integer':'Debe ser un número entero.',
  'Must be a lowercase slug':'Usa letras minúsculas, números y guiones.',
  'Must be a valid date':'Debe ser una fecha válida.',
  'Must be less than 1':'Debe ser menor que 1.',
  'Authentication required': 'Debes iniciar sesión.',
  'Invalid email or password': 'Correo electrónico o contraseña incorrectos.',
  'Not found': 'No se encontró el registro.',
  'Method not allowed': 'Esta operación no está permitida.',
  'Validation failed': 'Revisa los campos indicados.',
  'Too many login attempts': 'Demasiados intentos de inicio de sesión. Inténtalo más tarde.',
  'Too many login attempts, please try again later': 'Demasiados intentos de inicio de sesión. Inténtalo más tarde.',
  'Missing Authorization header': 'Debes iniciar sesión.',
  'Authorization header must be "Bearer <token>"': 'La sesión no es válida. Vuelve a iniciar sesión.',
  'Session expired, please log in again': 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
  'Invalid token': 'La sesión no es válida. Vuelve a iniciar sesión.',
  'SKU already exists': 'Ya existe un producto con este SKU.',
  'Product has stock history': 'El producto tiene un historial de inventario. Desactívalo para archivarlo.',
  'Product has stock history; set it inactive instead': 'El producto tiene un historial de inventario. Desactívalo para archivarlo.',
  'Unit cannot be changed after stock movements exist': 'No se puede cambiar la unidad de un producto con movimientos de inventario.',
  'A category with this name already exists': 'Ya existe una categoría con este nombre.',
  'A supplier with this name already exists': 'Ya existe un proveedor con este nombre.',
  'A user with this email already exists': 'Ya existe un usuario con este correo electrónico.',
  'You cannot delete your own account': 'No puedes eliminar tu propia cuenta.',
  'You cannot deactivate your own account': 'No puedes desactivar tu propia cuenta.',
  'This measurement was uploaded by another user': 'Otra cuenta ya subió esta medición.',
  'Measurement part is too large': 'El archivo supera el tamaño permitido.',
  'Expected multipart/form-data': 'La medición debe enviarse como formulario con archivos.',
  'Invalid multipart body': 'El formulario de archivos no es válido.',
  'Measurement file not found': 'No se encontró el archivo de la medición.',
  'Logo must be a PNG or JPEG image': 'El logo debe ser una imagen PNG o JPG.',
  'Must be a PNG or JPEG image': 'El logo debe ser una imagen PNG o JPG.',
  'Must be at most 2000 px wide and tall': 'El logo debe medir como máximo 2000 px por lado.',
  'Must be an 8-bit RGB or RGBA PNG': 'El PNG debe ser de 8 bits, RGB o RGBA.',
  'Must be an RGB JPEG without EXIF metadata': 'El JPG debe ser RGB y sin metadatos EXIF.',
  'Logo not found': 'La empresa todavía no tiene logo.',
  'Must be a hex color like #4F46E5': 'Usa un color como #4F46E5.',
  'Signature not found': 'La empresa todavía no tiene firma electrónica.',
  'Must be a PKCS#12 (.p12 or .pfx) file': 'El archivo debe ser una firma electrónica .p12 o .pfx.',
  'Wrong password': 'La contraseña no corresponde a esta firma.',
  'Must contain an RSA private key and its certificate': 'El archivo no tiene la clave de firma con su certificado.',
  'Uses unsupported encryption': 'El archivo usa un cifrado que no se puede leer. Exporta la firma de nuevo.',
  'The certificate has expired': 'La firma electrónica está caducada.',
  'The certificate is not valid yet': 'La firma electrónica todavía no está vigente.',
  'Must be at most 64 KB': 'El archivo debe pesar como máximo 64 KB.',
  'Required': 'Obligatorio',
  'Must be a string': 'Debe ser texto.',
  'Must be a number': 'Debe ser un número.',
  'Must be a valid email': 'Debe ser un correo electrónico válido.',
  'Must be an http:// or https:// URL': 'Debe ser una URL http:// o https://.',
  'Must be an integer id': 'El identificador debe ser un número entero.',
  'Must be a positive integer id': 'El identificador debe ser un número entero positivo.',
  'Must be true or false': 'Selecciona sí o no.',
  'May only contain letters, digits, ".", "_" and "-"': 'Solo puede contener letras, números, ".", "_" y "-".',
  'Request body must be a JSON object': 'Los datos de la solicitud deben ser un objeto JSON.',
  'Malformed JSON in request body': 'Los datos de la solicitud contienen un JSON no válido.',
  'Request body is too large': 'Los datos de la solicitud son demasiado grandes.',
  'Internal server error': 'Se produjo un error interno del servidor. Inténtalo de nuevo.',
  'Stock movements cannot be changed or deleted; record a new movement to correct a mistake': 'Los movimientos no se pueden modificar ni eliminar. Registra un nuevo movimiento para corregir un error.',
};

const codeMessages: Record<string, string> = {
  DOCUMENT_NOT_READY: 'Falta información para generar la cotización.',
  DOCUMENT_CHANGED: 'La cotización cambió. Revisa la vista previa actualizada.',
  BAD_REQUEST: 'La solicitud no es válida.',
  UNAUTHORIZED: 'Debes iniciar sesión.',
  INVALID_CREDENTIALS: messages['Invalid email or password'],
  NOT_FOUND: messages['Not found'],
  METHOD_NOT_ALLOWED: messages['Method not allowed'],
  CONFLICT: 'La operación entra en conflicto con los datos existentes.',
  INSUFFICIENT_STOCK: 'No hay existencias suficientes para registrar esta salida.',
  VALIDATION_ERROR: messages['Validation failed'],
  RATE_LIMITED: messages['Too many login attempts'],
  UNSUPPORTED_MEDIA_TYPE: 'El formato del archivo no es compatible.',
  PAYLOAD_TOO_LARGE: messages['Request body is too large'],
  INTERNAL_ERROR: messages['Internal server error'],
};

const comparisons: Record<string, string> = { 'greater than': 'mayor que', 'at least': 'al menos', 'at most': 'como máximo' };

const resourceNames: Record<string, string> = {
  Category: 'La categoría',
  Supplier: 'El proveedor',
  Product: 'El producto',
  'Stock movement': 'El movimiento',
  User: 'El usuario',
  Measurement: 'La medición',
};

/** The API contract stays unchanged; notifications and inline field errors are localized here. */
export const translateApiMessage = (message: unknown, fallback: string = REQUEST_FAILED_MESSAGE): string => {
  if (typeof message !== 'string') return fallback;
  if (Object.hasOwn(messages, message)) return messages[message];

  let match: RegExpExecArray | null = /^Must be at (most|least) (\d+) characters$/.exec(message);
  if (match) return `Debe tener ${match[1] === 'most' ? 'como máximo' : 'al menos'} ${match[2]} caracteres.`;
  match = /^Must be (greater than|at least|at most) (\d+(?:\.\d+)?)$/.exec(message);
  if (match) return `Debe ser ${comparisons[match[1]]} ${formatQuantity(Number(match[2]))}.`;
  match = /^Must have at most (\d+) items$/.exec(message);
  if (match) return `Puede tener como máximo ${match[1]} filas.`;
  match = /^Must have at most (\d+) decimal places$/.exec(message);
  if (match) return `Debe tener como máximo ${match[1]} decimales.`;
  match = /^(Category|Supplier|Product|Stock movement|User|Measurement) (\d+) (does not exist|not found)$/.exec(message);
  if (match) return `${resourceNames[match[1]]} con ID ${match[2]} no existe.`;
  match = /^(Category|Supplier) "(.+)" is used by (\d+) product\(s\)$/.exec(message);
  if (match) {
    return `${resourceNames[match[1]]} «${match[2]}» se utiliza en ${match[3]} ${match[3] === '1' ? 'producto' : 'productos'}.`;
  }
  match = /^(Category|Supplier) "(.+)" is used by products$/.exec(message);
  if (match) return `${resourceNames[match[1]]} «${match[2]}» está en uso por productos.`;
  match = /^Insufficient stock: requested ([\d.e+-]+) (\S+), available ([\d.e+-]+) (\S+)$/.exec(message);
  if (match) return `Existencias insuficientes: cantidad solicitada ${formatQuantity(Number(match[1]), match[2])}; disponible ${formatQuantity(Number(match[3]), match[4])}.`;
  if (message.startsWith('Must be one of:')) return 'Selecciona una de las opciones disponibles.';
  return fallback;
};

/** An API error in Spanish: its message when known, else what its code means, else a generic line. */
export const translateApiError = (message: unknown, code?: unknown): string => {
  const fallback: string | undefined =
    typeof code === 'string' && Object.hasOwn(codeMessages, code) ? codeMessages[code] : undefined;
  return translateApiMessage(message, fallback);
};
