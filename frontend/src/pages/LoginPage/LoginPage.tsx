import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Login } from './components/Login';
import { useAuth } from '../../auth/useAuth';
import { Container, Box } from '@mui/material';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // A thrown error (no answer from Omega) goes on to the Login form, which
  // tells it apart from a wrong password.
  const handleLogin = async (username: string, password: string) => {
    const success = await login(username, password);
    if (success) {
      // Only navigate after successful login
      navigate('/', { replace: true });
    }
    return success;
  };

  // This effect is now just a safeguard
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box sx={{ width: '100%' }}>
        <Login onLogin={handleLogin} />
      </Box>
    </Container>
  );
};
