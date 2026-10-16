import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
// Poppins, self-hosted, in the weights the theme uses and the latin + latin-ext subsets (Spanish
// needs both: á é í ó ú ñ ¿ ¡ are split across them).
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-ext-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-ext-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-ext-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/poppins/latin-ext-700.css';
import App from './App';
import { AppConfigContext } from './AppConfigContext';
import { configResult } from './config';
import ConfigErrorPage from './ConfigErrorPage';
import { registerServiceWorker } from './utils/serviceWorker';

const container: HTMLElement | null = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

const root: Root = createRoot(container);

if (configResult.ok) {
  document.title = configResult.config.appTitle;
  root.render(
    <StrictMode>
      <AppConfigContext.Provider value={configResult.config}>
        <App config={configResult.config} />
      </AppConfigContext.Provider>
    </StrictMode>,
  );
  registerServiceWorker();
} else {
  document.title = 'Error de configuración';
  root.render(<ConfigErrorPage errors={configResult.errors} />);
}
