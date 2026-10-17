export const documentFields: Record<string, string> = {
  tradeName: 'Nombre comercial', legalName: 'Razón social', taxId: 'RUC', address: 'Dirección', city: 'Ciudad', phone: 'Teléfono', email: 'Correo', website: 'Sitio web', signerName: 'Nombre', signerTitle: 'Cargo', brandColor: 'Color principal', numberPrefix: 'Prefijo de numeración', validityDays: 'Validez de la oferta (días)', paymentTerms: 'Forma de pago', introText: 'Texto de presentación', termsText: 'Términos generales', paperSize: 'Tamaño de papel (PDF)',
  clientLegalName: 'Razón social del cliente', clientTaxId: 'RUC / identificación', clientContactName: 'Persona de contacto', clientContactTitle: 'Cargo', clientEmail: 'Correo', clientPhone: 'Teléfono', clientAddress: 'Dirección', issueDate: 'Fecha de emisión', clientNotes: 'Observaciones para el cliente', lineMode: 'Presentación de ítems', contractMonths: 'Duración del contrato (meses)',
};
export const documentMessages: Record<string, string> = {
  QUOTE_NOT_CALCULATED: 'La cotización aún se está calculando o su cálculo falló.', QUOTE_NOT_CURRENT: 'Hay cambios que todavía no se calcularon.', QUOTE_NEEDS_REVIEW: 'La cotización está en Revisar: resuelve sus causas y confírmala.', PRICE_ZERO: 'El precio ofertado es cero.', ISSUER_FIELD_MISSING: 'Falta {campo} en los datos de tu empresa.', PAYMENT_TERMS_MISSING: 'Falta la forma de pago.', CLIENT_FIELD_MISSING: 'Falta {campo} del cliente.',
  PARAMETERS_CHANGED: 'Los parámetros cambiaron después de este cálculo. Recalcula antes de enviar si quieres usar los valores actuales.', MARGIN_BELOW_MINIMUM: 'El precio ofertado deja el margen bajo el mínimo.', FLOOR_AREA_APPROXIMATE: 'Hay superficies aproximadas en esta cotización.',
  SIGNATURE_EXPIRED: 'La firma electrónica de tu empresa caducó: el PDF sale sin firma. Carga una vigente en Empresa.', SIGNATURE_UNAVAILABLE: 'No se puede usar la firma electrónica guardada: el PDF sale sin firma. Vuelve a cargarla en Empresa.',
};
export const documentText: Record<string, string> = {
  title: 'Documento', quote: 'Cotización', preview: 'Vista previa', numbering: 'Numeración y validez', texts: 'Textos', defaultPaymentTerms: 'Forma de pago predeterminada', data: 'Datos del documento', client: 'Cliente', pdf: 'PDF', excel: 'EXCEL', save: 'Guardar', dirty: 'Cambios sin guardar', downloadPdf: 'Descargar PDF', downloadExcel: 'Descargar Excel', notReady: 'Falta información para generar la cotización', newRevision: 'nueva revisión: cambió desde la última descarga', history: 'Historial de descargas', noHistory: 'Todavía no hay descargas.', failed: 'No se pudo generar la vista previa.', retry: 'Reintentar', changed: 'La cotización cambió. Revisa la vista previa actualizada.', noPdf: 'Este navegador no puede mostrar PDF. Descárgalo para verlo.', marginConfirm: 'El margen está bajo el mínimo. ¿Descargar de todos modos?', settingsSaved: 'Las cotizaciones descargadas no cambian; las nuevas descargas usarán estos datos.', defaultValue: 'predeterminado', saved: 'Datos del documento guardados.', toCompany: 'Ir a Empresa',
};
/** The Empresa page: the company's data, its legal representative, and its logo and color on the documents. */
export const brandingText: Record<string, string> = {
  companyData: 'Datos de la empresa', legalRepresentative: 'Representante legal', legalRepresentativeHint: 'Firma las cotizaciones en nombre de la empresa.',
  section: 'Logo y colores', hint: 'Aparece en el encabezado de cada cotización, en PDF y Excel.', previewLabel: 'Vista previa del encabezado de la cotización',
  sampleTitle: 'COTIZACIÓN', sampleNumber: 'N.º {prefijo}-00001', sampleDescription: 'Descripción', sampleAmount: 'Valor', tradeNamePlaceholder: 'Nombre comercial',
  logo: 'Logo', uploadLogo: 'Subir logo', changeLogo: 'Cambiar logo', removeLogo: 'Quitar logo', removeLogoConfirm: '¿Quitar el logo? Las nuevas cotizaciones mostrarán el nombre comercial en su lugar.',
  logoRequirements: 'PNG o JPG, de preferencia horizontal y con fondo transparente.', dropLogo: 'Suelta la imagen para usarla como logo.',
  logoSaved: 'Logo actualizado.', logoRemoved: 'Logo quitado.', noLogo: 'Sin logo, las cotizaciones muestran el nombre comercial.', smallLogo: 'El logo es pequeño: puede verse borroso al imprimir.', logoLoadFailed: 'No se pudo cargar el logo.',
  logoType: 'El logo debe ser una imagen PNG o JPG.', logoTooLarge: 'El logo debe pesar como máximo 1 MB.', logoUnreadable: 'No se pudo leer la imagen. Prueba con otro PNG o JPG.', logoUnsupported: 'Este navegador no puede preparar el logo. Prueba con otro navegador.',
  colorHint: 'Para el título, los encabezados y las franjas de la cotización.', colorCode: 'Código de color', pickColor: 'Elegir color', colorInvalid: 'Usa un color como #4F46E5.',
  colorTooLight: 'Muy claro: la franja casi no se verá sobre el papel.', resetColor: 'Restablecer', logoColors: 'Colores de tu logo', useColor: 'Usar {color}',
};
/** The Empresa page's "Firma electrónica": the company's .p12, which signs every PDF and stamps its QR in the company's signature box. */
export const signatureText: Record<string, string> = {
  section: 'Firma electrónica', hint: 'Opcional. Con el archivo .p12 de tu firma electrónica, cada cotización en PDF sale firmada y con el código QR de la firma en el espacio de firma de tu empresa.',
  previewLabel: 'Vista previa del espacio de firma de la empresa', signedBy: 'Firmado electrónicamente por:', signByHand: 'Firma a mano',
  file: 'Archivo de firma', load: 'Cargar firma', change: 'Cambiar firma', remove: 'Quitar firma', removeConfirm: '¿Quitar la firma electrónica? Las nuevas descargas saldrán sin firma, con el espacio para firmar a mano.',
  requirements: 'Archivo .p12 o .pfx, el mismo que usas para firmar con FirmaEC. Su contraseña se guarda cifrada y solo se usa para firmar las cotizaciones.',
  holder: 'Titular', issuer: 'Emitida por', validUntil: 'Vigente hasta',
  none: 'Sin firma electrónica, las cotizaciones dejan el espacio para firmar a mano.', renew: 'Vence pronto: renuévala para seguir firmando las cotizaciones.',
  expired: 'Caducó: las cotizaciones se descargan sin firma hasta que cargues una vigente.', unavailable: 'No se puede usar la firma guardada: vuelve a cargarla.', loadFailed: 'No se pudo consultar la firma electrónica.',
  dialogTitle: 'Cargar firma electrónica', chooseFile: 'Elegir archivo', noFile: 'Ningún archivo elegido', password: 'Contraseña de la firma', cancel: 'Cancelar',
  saved: 'Firma electrónica cargada: las nuevas descargas en PDF saldrán firmadas.', removed: 'Firma electrónica quitada.',
  fileType: 'Elige un archivo .p12 o .pfx.', fileTooLarge: 'El archivo debe pesar como máximo 64 KB.', fileRequired: 'Elige el archivo de tu firma.', passwordRequired: 'Escribe la contraseña de la firma.',
};
export const documentIssueMessage =(issue: { code: string; params?: { field: string } }): string => (documentMessages[issue.code] ?? issue.code).replace('{campo}', documentFields[issue.params?.field ?? ''] ?? 'información').replace('del cliente del cliente.', 'del cliente.');
