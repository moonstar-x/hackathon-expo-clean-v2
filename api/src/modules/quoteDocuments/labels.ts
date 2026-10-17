export const labels = {
  client: 'CLIENTE', service: 'SERVICIO', scope: 'ALCANCE DEL SERVICIO', conditions: 'CONDICIONES COMERCIALES', notes: 'OBSERVACIONES', acceptance: 'ACEPTACIÓN',
  issueDate: 'Fecha de emisión', validUntil: 'Válida hasta', subtotal: 'Subtotal', currency: '(USD)', page: 'Página', of: 'de',
  lineColumns: ['#', 'Descripción', 'Cant.', 'Unidad', 'Precio unitario (USD)', 'Total (USD)'],
  // The electronic signature's stamp and its QR, worded as Ecuadorian signing tools (FirmaEC) word them.
  signedBy: 'Firmado electrónicamente por:', qr: { signedBy: 'FIRMADO POR', reason: 'RAZON', location: 'LOCALIZACION', date: 'FECHA', validate: 'VALIDAR CON: www.firmadigital.gob.ec' },
} as const;
