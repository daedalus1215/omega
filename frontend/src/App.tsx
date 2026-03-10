import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/useAuth';
import { SidebarProvider } from './contexts/SidebarContext';
import { LoginPage } from './pages/LoginPage/LoginPage';
import { RegisterPage } from './pages/RegisterPage/RegisterPage';
import { LandingPage } from './pages/LandingPage/LandingPage';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { muiTheme } from './theme';
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

export const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <Router>
          <SidebarProvider>
            <AppRoutes />
          </SidebarProvider>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};
