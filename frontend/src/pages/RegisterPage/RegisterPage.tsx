import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Register } from './components/Register';
import { useAuth } from '../../auth/useAuth';
import { Container, Box } from '@mui/material';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

  const handleRegister = async (username: string, password: string) => {
    try {
      const success = await register(username, password);
      if (success) {
        navigate('/login', { replace: true });
      }
      return success;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  // Redirect if already authenticated
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
        <Register onRegister={handleRegister} />
      </Box>
    </Container>
  );
};
