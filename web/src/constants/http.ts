/** Shown when the API can't be reached at all (down, offline, or CORS refused). */
export const NETWORK_ERROR_MESSAGE: string =
  'No se puede conectar con el servidor de inventario. Comprueba la conexión e inténtalo de nuevo.';

/** Shown when the API answers with an error it gave no readable message for. */
export const REQUEST_FAILED_MESSAGE: string = 'No se pudo completar la solicitud.';

/** Shown when the stored session is missing or has expired. */
export const SESSION_EXPIRED_MESSAGE: string = 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
