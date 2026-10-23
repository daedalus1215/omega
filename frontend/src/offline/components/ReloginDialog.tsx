import { useState, type FC, type FormEvent } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';
import { describeLoginError } from '../../auth/login-errors';
import { useAuth } from '../../auth/useAuth';
import { postStatusPatch } from '../offline-channel';
import { updateSyncStatus } from '../sync-status';

type ReloginDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Logs back in without leaving the current screen once the session has
 * expired. The login page is out of reach while the app still holds a token,
 * and dropping the token would hide the calendar stored offline.
 */
export const ReloginDialog: FC<ReloginDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { user, login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    let loggedIn: boolean;
    try {
      loggedIn = await login(user.username, password);
    } catch (err) {
      setError(describeLoginError(err));
      return;
    } finally {
      setSubmitting(false);
    }
    if (!loggedIn) {
      setError("That password didn't work. Try again.");
      return;
    }
    setPassword('');
    updateSyncStatus({ sessionExpired: false });
    // The other tabs' "Log in to sync" flags clear the same way.
    postStatusPatch({ sessionExpired: false });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth="xs"
      fullWidth
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>Session expired</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Log in again to sync. Until then, your changes are saved on this
            device.
          </DialogContentText>
          {/* Lets password managers match the saved login. */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={user?.username ?? ''}
            readOnly
            hidden
          />
          <TextField
            label={`Password for ${user?.username ?? ''}`}
            type="password"
            autoComplete="current-password"
            autoFocus
            fullWidth
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onOpenChange(false)}>Later</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || !password}
            startIcon={submitting ? <CircularProgress size={16} /> : undefined}
          >
            Log in
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
