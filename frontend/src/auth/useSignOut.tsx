import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { ROUTES } from '../constants/routes';
import { clearOfflineData } from '../offline/install-offline-support';
import { useSyncStatus } from '../offline/sync-status';
import { signOutAndClear, unsyncedChanges } from './sign-out';
import { useAuth } from './useAuth';

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

type SignOut = {
  signOut: () => void;
  /** Render next to the sign-out button; it opens when there's a question. */
  confirmDialog: ReactNode;
};

/**
 * What the sign-out buttons do: sign out and delete this device's offline
 * data, asking first when that would discard writes that haven't synced.
 * (useAuth's logout keeps the offline data, for re-logins as the same user.)
 */
export const useSignOut = (): SignOut => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const unsynced = unsyncedChanges(useSyncStatus());
  const [isConfirming, setIsConfirming] = useState(false);

  const signOutNow = () => {
    setIsConfirming(false);
    void signOutAndClear({
      logout,
      goToLogin: () => navigate(ROUTES.LOGIN),
      clearOfflineData,
      clearQueryCache: () => queryClient.clear(),
    });
  };

  const signOut = () => {
    if (unsynced > 0) {
      setIsConfirming(true);
    } else {
      signOutNow();
    }
  };

  const confirmDialog = (
    <Dialog
      open={isConfirming}
      onClose={() => setIsConfirming(false)}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Discard unsynced changes?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {plural(unsynced, 'change')} on this device{' '}
          {unsynced === 1 ? "hasn't" : "haven't"} reached the server yet.
          Signing out deletes {unsynced === 1 ? 'it' : 'them'}.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setIsConfirming(false)}>Stay signed in</Button>
        <Button color="error" variant="contained" onClick={signOutNow}>
          Sign out and discard
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { signOut, confirmDialog };
};
