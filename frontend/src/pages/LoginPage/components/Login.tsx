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
import { isTauri } from '../../../tauri/api-config';
import { openConnectionSettings } from '../../../tauri/connection-settings';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const success = await onLogin(username, password);
      if (!success) {
        setError('Incorrect username or password.');
      }
    } catch {
      setError(
        isTauri()
          ? "Couldn't reach Omega. Check your connection, or the server settings below."
          : "Couldn't reach Omega. Check your connection and try again."
      );
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
            <Logo height="clamp(72px, 26vmin, 116px)" />
            <Typography variant="h4" component="h1" fontWeight={600}>
              Login
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
            // Usernames match exactly; stop phone keyboards capitalizing them.
            slotProps={{
              htmlInput: {
                autoCapitalize: 'none',
                autoCorrect: 'off',
                spellCheck: false,
              },
            }}
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
            autoComplete="current-password"
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
            {isSubmitting ? 'Logging in...' : 'Login'}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Typography variant="body2"> 
              Don't have an account?{' '}
              <Link
                to="/register"
                style={{
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Register here
              </Link>
            </Typography>
            {isTauri() && (
              <Button
                size="small"
                onClick={openConnectionSettings}
                sx={{ mt: 1, textTransform: 'none' }}
              >
                Server settings
              </Button>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
