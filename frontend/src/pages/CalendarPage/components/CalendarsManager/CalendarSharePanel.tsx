import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  PersonRemove as PersonRemoveIcon,
} from '@mui/icons-material';
import { AxiosError } from 'axios';
import { CalendarResponseDto } from '../../../../api/dtos/calendars.dtos';
import {
  useCalendarMembers,
  useInviteMember,
  useRemoveMember,
} from '../../hooks/useCalendarSharing';
import { useAuth } from '../../../../auth/useAuth';

type CalendarSharePanelProps = {
  calendar: CalendarResponseDto;
  onBack: () => void;
};

const extractError = (error: unknown, fallback: string): string => {
  const message = (error as AxiosError<{ message?: string | string[] }>)
    ?.response?.data?.message;
  if (Array.isArray(message)) {
    return message[0];
  }
  return message || fallback;
};

/**
 * Panel for sharing a single calendar: invite a user by username, view members,
 * and remove a member (or leave the calendar yourself).
 */
export const CalendarSharePanel: React.FC<CalendarSharePanelProps> = ({
  calendar,
  onBack,
}) => {
  const { user } = useAuth();
  const currentUserId = user ? Number(user.id) : null;
  const { members, isLoading } = useCalendarMembers(calendar.id);
  const inviteMutation = useInviteMember(calendar.id);
  const removeMutation = useRemoveMember(calendar.id);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleInvite = async () => {
    const name = username.trim();
    if (!name) {
      return;
    }
    setError(null);
    setInfo(null);
    try {
      await inviteMutation.mutateAsync(name);
      setUsername('');
      setInfo(`Invitation sent to ${name}`);
    } catch (err) {
      setError(extractError(err, 'Failed to send invitation'));
    }
  };

  const handleRemove = async (userId: number, isSelf: boolean) => {
    setError(null);
    setInfo(null);
    try {
      await removeMutation.mutateAsync(userId);
      if (isSelf) {
        onBack();
      }
    } catch (err) {
      setError(extractError(err, 'Failed to remove member'));
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton aria-label="back" onClick={onBack} edge="start">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">Share “{calendar.name}”</Typography>
      </Stack>

      <Stack direction="row" spacing={1}>
        <TextField
          label="Invite by username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          size="small"
          fullWidth
          disabled={inviteMutation.isPending}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleInvite();
            }
          }}
        />
        <Button
          variant="contained"
          onClick={handleInvite}
          disabled={inviteMutation.isPending || !username.trim()}
        >
          {inviteMutation.isPending ? <CircularProgress size={20} /> : 'Invite'}
        </Button>
      </Stack>
      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
      {info && (
        <Typography color="success.main" variant="body2" sx={{ mt: 1 }}>
          {info}
        </Typography>
      )}

      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
        Members
      </Typography>
      {isLoading ? (
        <CircularProgress size={20} />
      ) : (
        <List disablePadding>
          {members.map(member => {
            const isSelf = member.userId === currentUserId;
            const viewerIsOwner = calendar.role === 'owner';
            const canRemove =
              member.role !== 'owner' && (isSelf || viewerIsOwner);
            return (
              <ListItem key={member.userId} disableGutters sx={{ gap: 1 }}>
                <Typography sx={{ flex: 1 }}>
                  {member.username}
                  {isSelf && ' (you)'}
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    sx={{ ml: 1 }}
                  >
                    {member.role}
                  </Typography>
                </Typography>
                {canRemove && (
                  <Tooltip title={isSelf ? 'Leave calendar' : 'Remove member'}>
                    <IconButton
                      aria-label={isSelf ? 'leave' : 'remove member'}
                      onClick={() => handleRemove(member.userId, isSelf)}
                      disabled={removeMutation.isPending}
                    >
                      <PersonRemoveIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
};
