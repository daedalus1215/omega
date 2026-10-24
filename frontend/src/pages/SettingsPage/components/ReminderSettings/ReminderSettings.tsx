import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { isTauriAndroid } from '../../../../tauri/api-config';
import {
  setRemindersEnabled,
  useRemindersEnabled,
} from '../../../../tauri/reminder-setting';

// Loaded on demand, so Tauri's bindings stay out of the web bundle.
const reminderDevice = () => import('../../../../tauri/reminder-device');

type DeviceState = {
  permitted: boolean;
  scheduled: number;
};

const plural = (count: number, noun: string) =>
  `${count.toLocaleString()} ${noun}${count === 1 ? '' : 's'}`;

/**
 * Reminder notifications on this phone (the Android app only): on or off,
 * how many are scheduled, and a way past Android's permission prompt after
 * a no.
 */
export const ReminderSettings: React.FC = () => {
  const enabled = useRemindersEnabled();
  const [device, setDevice] = useState<DeviceState>();
  const [askedAgain, setAskedAgain] = useState(false);

  const refresh = async () => {
    const { hasReminderPermission, countScheduledReminders } =
      await reminderDevice();
    const [permitted, scheduled] = await Promise.all([
      hasReminderPermission(),
      countScheduledReminders(),
    ]);
    setDevice({ permitted, scheduled });
  };

  useEffect(() => {
    if (!isTauriAndroid()) return;
    // Turning reminders back on schedules them in the background; give that
    // a moment before counting.
    const timer = window.setTimeout(() => {
      refresh().catch(error =>
        console.error('Could not read the reminder state:', error)
      );
    }, 500);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  if (!isTauriAndroid()) return null;

  const handleAllow = async () => {
    const { askForReminderPermission } = await reminderDevice();
    await askForReminderPermission();
    setAskedAgain(true);
    await refresh();
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Reminders
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Reminders set on events show up as notifications on this phone, as well
        as by email. Changes made elsewhere reach the phone when it next syncs.
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            onChange={event => setRemindersEnabled(event.target.checked)}
          />
        }
        label="Notify me on this phone"
      />
      {enabled && device && (
        <Stack spacing={1} sx={{ mt: 1 }}>
          {device.permitted ? (
            <Typography variant="body2">
              {plural(device.scheduled, 'reminder')} scheduled for the next 14
              days
            </Typography>
          ) : (
            <>
              <Typography variant="body2" color="error">
                {askedAgain
                  ? "Android didn't allow it. Turn on notifications for Omega in Android's settings: Apps → Omega → Notifications."
                  : "Android is blocking notifications from Omega, so reminders won't show."}
              </Typography>
              {!askedAgain && (
                <Box>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => void handleAllow()}
                  >
                    Allow notifications
                  </Button>
                </Box>
              )}
            </>
          )}
        </Stack>
      )}
    </Box>
  );
};
