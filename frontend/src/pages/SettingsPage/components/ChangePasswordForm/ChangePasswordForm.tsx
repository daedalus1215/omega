import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
} from '@mui/material';
import { useUpdatePassword } from '../../hooks/useUpdatePassword';

export const ChangePasswordForm: React.FC = () => {
  const { updatePassword, isUpdating, error } = useUpdatePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    // Validate password format
    if (newPassword.length < 6 || newPassword.length > 50) {
      setValidationError('Password must be between 6 and 50 characters');
      return;
    }

    // Validate password match
    if (newPassword !== confirmPassword) {
      setValidationError('New password and confirmation password do not match');
      return;
    }

    if (!currentPassword) {
      setValidationError('Current password is required');
      return;
    }

    try {
      await updatePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setSuccessMessage('Password updated successfully.');
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Change Password
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter your current password and choose a new password.
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
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
        <TextField
          label="New Password"
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          fullWidth
          required
          margin="normal"
          disabled={isUpdating}
          inputProps={{ minLength: 6, maxLength: 50 }}
        />
        <TextField
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          fullWidth
          required
          margin="normal"
          disabled={isUpdating}
          inputProps={{ minLength: 6, maxLength: 50 }}
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
          {isUpdating ? 'Updating...' : 'Update Password'}
        </Button>
      </Box>
    </Paper>
  );
};
