import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import { ThemeProvider } from '@mui/material/styles';
import { lightTheme } from './theme';
import { configErrorCodeSx, configErrorListSx, configErrorPageSx } from './styles/configError';
import type { ConfigErrorPageProps } from './types/config';

/** Rendered instead of the app when the build-time configuration is invalid, in the app's own theme. */
const ConfigErrorPage = ({ errors }: ConfigErrorPageProps): ReactElement => {
  const missingApiUrl: boolean = errors.some((error: string): boolean => error.startsWith('VITE_API_URL'));
  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <Box component="main" sx={configErrorPageSx}>
        <Typography component="h1" variant="h4" sx={{ mb: 2 }}>
          {missingApiUrl ? 'Falta la configuración: VITE_API_URL' : 'Configuración no válida'}
        </Typography>
        <Typography>La aplicación no puede iniciarse porque la configuración de compilación no es válida:</Typography>
        <Box component="ul" sx={configErrorListSx}>
          {errors.map(
            (error: string): ReactElement => (
              <li key={error}>{error}</li>
            ),
          )}
        </Box>
        <Typography>
          Define las variables en{' '}
          <Box component="code" sx={configErrorCodeSx}>
            .env
          </Box>{' '}
          (consulta{' '}
          <Box component="code" sx={configErrorCodeSx}>
            .env.example
          </Box>
          ) o en el entorno de compilación. Después, reinicia el servidor de desarrollo o vuelve a compilar la
          aplicación: Vite incorpora las variables{' '}
          <Box component="code" sx={configErrorCodeSx}>
            VITE_*
          </Box>{' '}
          durante la compilación.
        </Typography>
      </Box>
    </ThemeProvider>
  );
};

export default ConfigErrorPage;
