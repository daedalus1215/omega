import React, { useContext, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
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
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { BottomSheet } from '../../../../components/BottomSheet/BottomSheet';
import { CalendarContext } from '../../../../contexts/CalendarContext';
import {
  useCreateCalendar,
  useDeleteCalendar,
  useUpdateCalendar,
} from '../../hooks/useCalendars';
import { CalendarResponseDto } from '../../../../api/dtos/calendars.dtos';
import { InvitationsInbox } from './InvitationsInbox';
import { CalendarSharePanel } from './CalendarSharePanel';

type CalendarsManagerProps = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Bottom-sheet manager for the user's calendars: toggle visibility,
 * create, rename, and delete calendars.
 */
export const CalendarsManager: React.FC<CalendarsManagerProps> = ({
  isOpen,
  onClose,
}) => {
  const { calendars, isCalendarVisible, toggleCalendarVisibility } =
    useContext(CalendarContext);
  const createMutation = useCreateCalendar();
  const updateMutation = useUpdateCalendar();
  const deleteMutation = useDeleteCalendar();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [sharingCalendar, setSharingCalendar] =
    useState<CalendarResponseDto | null>(null);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      return;
    }
    setActionError(null);
    try {
      await createMutation.mutateAsync({ name });
      setNewName('');
    } catch {
      setActionError('Failed to create calendar');
    }
  };

  const startEditing = (calendar: CalendarResponseDto) => {
    setEditingId(calendar.id);
    setEditingName(calendar.name);
    setActionError(null);
  };

  const handleRename = async (id: number) => {
    const name = editingName.trim();
    if (!name) {
      return;
    }
    setActionError(null);
    try {
      await updateMutation.mutateAsync({ id, updates: { name } });
      setEditingId(null);
    } catch {
      setActionError('Failed to rename calendar');
    }
  };

  const handleDelete = async (calendar: CalendarResponseDto) => {
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(calendar.id);
    } catch {
      setActionError(
        `Could not delete "${calendar.name}". A calendar must be empty before deletion.`
      );
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {sharingCalendar ? (
        <CalendarSharePanel
          calendar={sharingCalendar}
          onBack={() => setSharingCalendar(null)}
        />
      ) : (
        <Box>
          <InvitationsInbox />
          <Typography variant="h6" sx={{ mb: 2 }}>
            Calendars
          </Typography>
          <List disablePadding>
            {calendars.map(calendar => (
              <ListItem key={calendar.id} disableGutters sx={{ gap: 1 }}>
                <Checkbox
                  edge="start"
                  checked={isCalendarVisible(calendar.id)}
                  onChange={() => toggleCalendarVisibility(calendar.id)}
                  sx={{
                    color: calendar.color || 'primary.main',
                    '&.Mui-checked': {
                      color: calendar.color || 'primary.main',
                    },
                  }}
                />
                {editingId === calendar.id ? (
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ flex: 1 }}
                  >
                    <TextField
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      size="small"
                      fullWidth
                      autoFocus
                    />
                    <IconButton
                      aria-label="save"
                      onClick={() => handleRename(calendar.id)}
                      disabled={updateMutation.isPending}
                    >
                      <CheckIcon />
                    </IconButton>
                    <IconButton
                      aria-label="cancel"
                      onClick={() => setEditingId(null)}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Stack>
                ) : (
                  <>
                    <Typography sx={{ flex: 1 }}>
                      {calendar.name}
                      {calendar.isPersonal && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          Personal
                        </Typography>
                      )}
                    </Typography>
                    {calendar.role === 'owner' && (
                      <Tooltip title="Rename">
                        <IconButton
                          aria-label="rename"
                          onClick={() => startEditing(calendar)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!calendar.isPersonal && (
                      <Tooltip title="Share">
                        <IconButton
                          aria-label="share"
                          onClick={() => setSharingCalendar(calendar)}
                        >
                          <PersonAddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {calendar.role === 'owner' && !calendar.isPersonal && (
                      <Tooltip title="Delete">
                        <IconButton
                          aria-label="delete"
                          onClick={() => handleDelete(calendar)}
                          disabled={deleteMutation.isPending}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </>
                )}
              </ListItem>
            ))}
          </List>
          {actionError && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {actionError}
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <TextField
              label="New calendar"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              size="small"
              fullWidth
              disabled={createMutation.isPending}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={createMutation.isPending || !newName.trim()}
            >
              {createMutation.isPending ? (
                <CircularProgress size={20} />
              ) : (
                'Add'
              )}
            </Button>
          </Stack>
        </Box>
      )}
    </BottomSheet>
  );
};
