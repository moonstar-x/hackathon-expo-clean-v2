import { useEffect, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ThemeProvider } from '@mui/material/styles';
import { useCheckAuth, useNavigate, useTranslate, type TranslateFunction } from 'react-admin';
import { useAppConfig } from '../../AppConfigContext';
import { darkTheme } from '../../theme';
import {
  formColumnSx,
  formSideSx,
  hintSx,
  loginRootSx,
  logoPaneSx,
  productSx,
  titleSx,
} from '../../styles/login';
import AnimatedLogo from './AnimatedLogo';
import LoginForm from './LoginForm';

/** Sign-in page: the animated logo beside the email and password form, always on brand navy. */
const LoginPage = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const { appTitle } = useAppConfig();
  const checkAuth: ReturnType<typeof useCheckAuth> = useCheckAuth();
  const navigate: ReturnType<typeof useNavigate> = useNavigate();

  // Someone already signed in goes straight to the admin. <Admin> has no requireAuth (it loops
  // with React 19 and react-router 7), so this page does the redirect itself.
  useEffect((): void => {
    checkAuth({}, false)
      .then((): void => navigate('/'))
      .catch((): void => undefined);
  }, [checkAuth, navigate]);

  // The page is navy whichever theme the admin uses, so its inputs always use the dark theme.
  return (
    <ThemeProvider theme={darkTheme}>
      <Box component="main" sx={loginRootSx}>
        <Box sx={logoPaneSx}>
          <AnimatedLogo />
          <Typography component="p" sx={productSx}>
            {appTitle}
          </Typography>
        </Box>
        <Box sx={formSideSx}>
          <Box sx={formColumnSx}>
            <Typography component="h1" sx={titleSx}>
              {translate('app.auth.title')}
            </Typography>
            <Typography variant="body1" sx={hintSx}>
              {translate('app.auth.hint')}
            </Typography>
            <LoginForm />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default LoginPage;
