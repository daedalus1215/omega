import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Stack,
  Divider,
} from '@mui/material';
import { Logo } from '../../components/Logo/Logo';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container
      maxWidth="lg"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: 4,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          gap: { xs: 4, md: 8 },
          width: '100%',
        }}
      >
        {/* Logo Section */}
        <Box
          sx={{
            flex: { xs: '0 0 auto', md: '1 1 50%' },
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Logo height={300} />
        </Box>

        {/* Action Section */}
        <Box
          sx={{
            flex: { xs: '0 0 auto', md: '1 1 50%' },
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            maxWidth: { xs: '100%', md: '500px' },
          }}
        >
          <Box>
            <Typography
              variant="h2"
              component="h1"
              fontWeight={700}
              sx={{
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                lineHeight: 1.2,
                mb: 2,
              }}
            >
              Alpha-Omega
            </Typography>
            <Typography
              variant="h5"
              component="p"
              color="text.secondary"
              sx={{
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 400,
                lineHeight: 1.6,
              }}
            >
              Your personal calendar management app. Organize your schedule,
              set reminders, and stay on top of your events.
            </Typography>
          </Box>

          <Stack spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              fullWidth
              sx={{
                py: 1.5,
                borderRadius: '9999px',
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              Create account
            </Button>

            <Divider sx={{ my: 1 }}>
              <Typography variant="body2" color="text.secondary">
                or
              </Typography>
            </Divider>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Already have an account?
              </Typography>
              <Button
                component={Link}
                to="/login"
                variant="outlined"
                size="large"
                fullWidth
                sx={{
                  py: 1.5,
                  borderRadius: '9999px',
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                  },
                }}
              >
                Sign in
              </Button>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Container>
  );
};
