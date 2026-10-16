import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppConfigContext } from './AppConfigContext';
import { configResult } from './config';
import { ConfigErrorPage } from './ConfigErrorPage';

const root = createRoot(document.getElementById('root')!);

if (configResult.ok) {
  document.title = configResult.config.appTitle;
  root.render(
    <StrictMode>
      <AppConfigContext.Provider value={configResult.config}>
        <App config={configResult.config} />
      </AppConfigContext.Provider>
    </StrictMode>,
  );
} else {
  document.title = 'Error de configuración';
  root.render(<ConfigErrorPage errors={configResult.errors} />);
}
