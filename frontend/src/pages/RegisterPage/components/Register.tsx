import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Stack,
  Box,
  Typography,
} from '@mui/material';
import { Logo } from '../../../components/Logo/Logo';

interface RegisterProps {
  onRegister: (username: string, password: string) => Promise<boolean>;
}

export const Register: React.FC<RegisterProps> = ({ onRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    try {
      const success = await onRegister(username, password);
      if (!success) {
        setError('Registration failed. Username might be taken.');
      }
    } catch {
      setError('An error occurred during registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      elevation={3}
      sx={{
        maxWidth: 400,
        width: '100%',
        mx: 'auto',
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              mb: 1,
            }}
          >
            <Logo height={75} />
            <Typography variant="h4" component="h1" fontWeight={600}>
              Register
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Username"
            type="text"
            id="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            disabled={isSubmitting}
            fullWidth
            autoComplete="username"
          />

          <TextField
            label="Password"
            type="password"
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={isSubmitting}
            fullWidth
            autoComplete="new-password"
          />

          <TextField
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            disabled={isSubmitting}
            fullWidth
            autoComplete="new-password"
            error={confirmPassword !== '' && password !== confirmPassword}
            helperText={
              confirmPassword !== '' && password !== confirmPassword
                ? 'Passwords do not match'
                : ''
            }
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting}
            fullWidth
            sx={{
              py: 1.5,
              borderRadius: '9999px',
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            {isSubmitting ? 'Registering...' : 'Register'}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Typography variant="body2">
              Already have an account?{' '}
              <Link
                to="/login"
                style={{
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Login here
              </Link>
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
