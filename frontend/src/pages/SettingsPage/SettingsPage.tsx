import React from 'react';
import { Container, Box, Typography, Button } from '@mui/material';
import { useSignOut } from '../../auth/useSignOut';
import { ChangeUsernameForm } from './components/ChangeUsernameForm/ChangeUsernameForm';
import { ChangePasswordForm } from './components/ChangePasswordForm/ChangePasswordForm';
import { OfflineSettings } from './components/OfflineSettings/OfflineSettings';
import { ReminderSettings } from './components/ReminderSettings/ReminderSettings';
import { ThemeModeSettings } from './components/ThemeModeSettings/ThemeModeSettings';

export const SettingsPage: React.FC = () => {
  // Deletes this device's offline data too, asking first if anything
  // hasn't synced (src/offline).
  const { signOut, confirmDialog } = useSignOut();

  return (
    <Box
      sx={{
        height: '100%',
        overflowY: 'scroll',
        overflowX: 'hidden',
      }}
    >
      <Container maxWidth="md" sx={{ py: 4, pb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Account Settings
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Manage your account settings. Update your username or change your
          password.
        </Typography>
        <ThemeModeSettings />
        <OfflineSettings />
        <ReminderSettings />
        <Box sx={{ pb: 4, mb: 4, borderBottom: 1, borderColor: 'divider' }}>
          <ChangeUsernameForm />
          <ChangePasswordForm />
        </Box>
        <Box sx={{ pt: 2, pb: 8, borderTop: 1, borderColor: 'divider' }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={signOut}
            aria-label="Sign out"
          >
            Sign out
          </Button>
        </Box>
      </Container>
      {confirmDialog}
    </Box>
  );
};
