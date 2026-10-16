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
        {missingApiUrl ? 'Missing configuration: VITE_API_URL' : 'Invalid configuration'}
      </h1>
      <p>The admin app cannot start because its build-time configuration is invalid:</p>
      <ul>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
      <p>
        Set the variables in <code>.env</code> (see <code>.env.example</code>) or in the build environment, then
        restart the dev server or rebuild. Vite inlines <code>VITE_*</code> variables at build time.
      </p>
    </main>
  );
}
