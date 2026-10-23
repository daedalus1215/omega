import React, { useEffect, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  getOfflineSummary,
  syncNow,
  type OfflineSummary,
} from '../../../../offline/install-offline-support';
import { useSyncStatus } from '../../../../offline/sync-status';
import { isTauri } from '../../../../tauri/api-config';
import { openConnectionSettings } from '../../../../tauri/connection-settings';

const plural = (count: number, noun: string) =>
  `${count.toLocaleString()} ${noun}${count === 1 ? '' : 's'}`;

/**
 * The dates the stored events cover, as one span. Ranges end on the first
 * day of the month after, so the last day shown is the one before.
 */
const describeCoverage = ({ coverage }: OfflineSummary): string | null => {
  if (coverage.length === 0) return null;
  const start = Math.min(...coverage.map(range => range.start));
  const end = Math.max(...coverage.map(range => range.end)) - 1;
  // Plain UTC dates, shown as such.
  const day = (ms: number) => {
    const date = new Date(ms);
    return format(
      new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      'MMM d, yyyy'
    );
  };
  return `${day(start)} – ${day(end)}`;
};

/**
 * What this device keeps for working offline (the Tauri app only): the
 * stored calendar, changes waiting to sync, and the way to the connection
 * settings. Android has no tray, so "Sync now" lives here too.
 */
export const OfflineSettings: React.FC = () => {
  const { pending, failed } = useSyncStatus();
  const queryClient = useQueryClient();
  const [summary, setSummary] = useState<OfflineSummary>();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    void getOfflineSummary().then(setSummary);
  }, [pending]);

  if (!isTauri()) return null;

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      if (await syncNow()) {
        await queryClient.refetchQueries({ type: 'active' });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const coverage = summary && describeCoverage(summary);

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Offline
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This device keeps a copy of your calendar, so it works without a
        connection. Changes made offline sync when the server is back.
      </Typography>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        {summary && (
          <Typography variant="body2">
            {plural(summary.events, 'event')} stored on this device
            {coverage && `, ${coverage}`}
          </Typography>
        )}
        <Typography variant="body2">
          {pending > 0
            ? `${plural(pending, 'change')} waiting to sync`
            : 'All changes synced'}
        </Typography>
        {failed > 0 && (
          <Typography variant="body2" color="error">
            {plural(failed, 'change')} the server rejected
          </Typography>
        )}
      </Stack>
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          color="inherit"
          disabled={pending === 0 || isSyncing}
          onClick={() => void handleSyncNow()}
        >
          {isSyncing ? 'Syncing…' : 'Sync now'}
        </Button>
        <Button
          variant="outlined"
          color="inherit"
          onClick={openConnectionSettings}
        >
          Connection settings
        </Button>
      </Stack>
    </Box>
  );
};
