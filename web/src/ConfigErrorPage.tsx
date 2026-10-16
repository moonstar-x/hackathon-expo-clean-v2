/** Rendered instead of the app when the build-time configuration is invalid. */
export function ConfigErrorPage({ errors }: { errors: string[] }) {
  const missingApiUrl = errors.some((e) => e.startsWith('VITE_API_URL'));
  return (
    <main
      style={{
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        maxWidth: 640,
        margin: '10vh auto',
        padding: '0 16px',
        lineHeight: 1.5,
        color: '#222',
      }}
    >
      <h1 style={{ fontSize: 24 }}>
        {missingApiUrl ? 'Falta la configuración: VITE_API_URL' : 'Configuración no válida'}
      </h1>
      <p>La aplicación no puede iniciarse porque la configuración de compilación no es válida:</p>
      <ul>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
      <p>
        Define las variables en <code>.env</code> (consulta <code>.env.example</code>) o en el entorno de compilación.
        Después, reinicia el servidor de desarrollo o vuelve a compilar la aplicación. Vite incorpora las variables
        <code> VITE_*</code> durante la compilación.
      </p>
    </main>
  );
}
