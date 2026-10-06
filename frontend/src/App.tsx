import React, { useContext, useMemo } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/useAuth';
import { SidebarProvider } from './contexts/SidebarContext';
import {
  ThemeModeContext,
  ThemeModeProvider,
} from './contexts/ThemeModeContext';
import { LoginPage } from './pages/LoginPage/LoginPage';
import { RegisterPage } from './pages/RegisterPage/RegisterPage';
import { LandingPage } from './pages/LandingPage/LandingPage';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createMuiTheme } from './theme';
import { CalendarPage } from './pages/CalendarPage/CalendarPage';
import { SettingsPage } from './pages/SettingsPage/SettingsPage';
import { ROUTES } from './constants/routes';
import { AuthenticatedLayout } from './components/Layout/AuthenticatedLayout';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <Routes>
        <Route element={<AuthenticatedLayout />}>
          <Route path={ROUTES.HOME} element={<CalendarPage />} />
          <Route path={ROUTES.CALENDAR} element={<CalendarPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          <Route
            path={ROUTES.LOGIN}
            element={<Navigate to={ROUTES.HOME} replace />}
          />
          <Route
            path={ROUTES.REGISTER}
            element={<Navigate to={ROUTES.HOME} replace />}
          />
          <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path={ROUTES.LANDING} element={<LandingPage />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  );
};

const AppShell: React.FC = () => {
  const { resolvedMode } = useContext(ThemeModeContext);
  const theme = useMemo(() => createMuiTheme(resolvedMode), [resolvedMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <SidebarProvider>
          <AppRoutes />
        </SidebarProvider>
      </Router>
    </ThemeProvider>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <ThemeModeProvider>
        <AppShell />
      </ThemeModeProvider>
    </AuthProvider>
  );
};
