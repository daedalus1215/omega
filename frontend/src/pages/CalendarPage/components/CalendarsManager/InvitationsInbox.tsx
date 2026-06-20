import React from 'react';
import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  Stack,
  Typography,
} from '@mui/material';
import {
  useInvitations,
  useRespondToInvitation,
} from '../../hooks/useCalendarSharing';

/**
 * Lists the user's pending calendar invitations with Accept/Decline actions.
 * Renders nothing when there are no pending invitations.
 */
export const InvitationsInbox: React.FC = () => {
  const { invitations } = useInvitations();
  const respond = useRespondToInvitation();

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Invitations
      </Typography>
      <List disablePadding>
        {invitations.map(invitation => (
          <ListItem key={invitation.id} disableGutters>
            <Stack sx={{ flex: 1 }} spacing={0.5}>
              <Typography variant="body2">
                <strong>{invitation.inviterUsername}</strong> invited you to{' '}
                <strong>{invitation.calendarName}</strong>
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  disabled={respond.isPending}
                  onClick={() =>
                    respond.mutate({
                      invitationId: invitation.id,
                      accept: true,
                    })
                  }
                >
                  Accept
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={respond.isPending}
                  onClick={() =>
                    respond.mutate({
                      invitationId: invitation.id,
                      accept: false,
                    })
                  }
                >
                  Decline
                </Button>
              </Stack>
            </Stack>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ mt: 2 }} />
    </Box>
  );
};
