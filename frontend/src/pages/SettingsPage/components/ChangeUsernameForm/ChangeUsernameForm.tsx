import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
} from '@mui/material';
import { useUpdateUsername } from '../../hooks/useUpdateUsername';

export const ChangeUsernameForm: React.FC = () => {
  const { updateUsername, isUpdating, error } = useUpdateUsername();
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    // Validate username format
    if (newUsername.trim().length < 4 || newUsername.trim().length > 20) {
      setValidationError('Username must be between 4 and 20 characters');
      return;
    }

    if (!currentPassword) {
      setValidationError('Current password is required');
      return;
    }

    try {
      await updateUsername({
        newUsername: newUsername.trim(),
        currentPassword,
      });
      setSuccessMessage('Username updated successfully. You will be redirected to login.');
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Change Username
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Changing your username will require you to log in again with your new username.
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          label="New Username"
          type="text"
          value={newUsername}
          onChange={e => setNewUsername(e.target.value)}
          fullWidth
          required
          margin="normal"
          disabled={isUpdating}
          inputProps={{ minLength: 4, maxLength: 20 }}
        />
        <TextField
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          fullWidth
          required
          margin="normal"
          disabled={isUpdating}
        />
        {validationError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {validationError}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {successMessage}
          </Alert>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isUpdating}
          sx={{ mt: 2 }}
        >
          {isUpdating ? 'Updating...' : 'Update Username'}
        </Button>
      </Box>
    </Paper>
  );
};
