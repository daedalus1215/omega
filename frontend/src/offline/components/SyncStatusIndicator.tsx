import { useState, type FC, type ReactElement } from 'react';
import { Badge, Chip, IconButton, Tooltip } from '@mui/material';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import KeyIcon from '@mui/icons-material/Key';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ShieldIcon from '@mui/icons-material/Shield';
import SyncIcon from '@mui/icons-material/Sync';
import { openConnectionSettings } from '../../tauri/connection-settings';
import { useSyncStatus, type SyncStatus } from '../sync-status';
import { ReloginDialog } from './ReloginDialog';

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

type Indicator = {
  label: string;
  tooltip?: string;
  icon: ReactElement;
  error: boolean;
  /** The number the compact icon shows. */
  count: number;
  action?: 'relogin' | 'connection-settings';
};

/** What to show, in the same precedence as the tray's status line. */
const describe = ({
  reachable,
  pending,
  failed,
  sessionExpired,
  accessDenied,
}: SyncStatus): Indicator | null => {
  const waiting = pending > 0 ? ` · ${pending} pending` : '';
  if (accessDenied) {
    return {
      label: `Connection rejected${waiting}`,
      tooltip:
        "Cloudflare Access turned this device's connection settings away. Changes are saved on this device. Click to update the settings.",
      icon: <ShieldIcon />,
      error: true,
      count: pending,
      action: 'connection-settings',
    };
  }
  if (sessionExpired) {
    return {
      label: `Log in to sync${waiting}`,
      tooltip:
        'Your session expired. Changes are saved on this device until you log in again. Click to log in.',
      icon: <KeyIcon />,
      error: true,
      count: pending,
      action: 'relogin',
    };
  }
  if (failed > 0) {
    return {
      label: `${plural(failed, 'change')} not saved`,
      tooltip: `The server rejected ${failed === 1 ? 'this change' : 'these changes'} when syncing.${pending > 0 ? ` ${plural(pending, 'other change')} still pending.` : ''}`,
      icon: <ReportProblemIcon />,
      error: true,
      count: failed,
    };
  }
  if (!reachable) {
    return {
      label: `Offline${waiting}`,
      tooltip:
        "Can't reach the server. Changes are saved on this device and will sync automatically when it's back.",
      icon: <CloudOffIcon />,
      error: false,
      count: pending,
    };
  }
  if (pending > 0) {
    return {
      label: `Syncing ${plural(pending, 'change')}`,
      icon: <SyncIcon />,
      error: false,
      count: pending,
    };
  }
  return null;
};

type SyncStatusIndicatorProps = {
  /**
   * An icon with a count, for the desktop sidebar rail, which has no room
   * for the full label; it's the tooltip and accessible name instead.
   */
  compact?: boolean;
};

/**
 * Badge for offline state, unsynced writes, an expired session and
 * Cloudflare Access turning requests away, wherever the offline layer is
 * installed (the Tauri app). Renders nothing when everything is in sync,
 * and always on the web, where the status never leaves its default.
 */
export const SyncStatusIndicator: FC<SyncStatusIndicatorProps> = ({
  compact = false,
}) => {
  const indicator = describe(useSyncStatus());
  const [isReloginOpen, setIsReloginOpen] = useState(false);

  if (!indicator) return null;

  const handleClick =
    indicator.action === 'relogin'
      ? () => setIsReloginOpen(true)
      : indicator.action === 'connection-settings'
        ? openConnectionSettings
        : undefined;
  const color = indicator.error ? 'error' : 'default';

  const badge = compact ? (
    <IconButton
      aria-label={indicator.label}
      onClick={handleClick}
      color={indicator.error ? 'error' : 'default'}
      // Not clickable without an action, but still focusable for the tooltip.
      disableRipple={!handleClick}
    >
      <Badge badgeContent={indicator.count} color={color} max={99}>
        {indicator.icon}
      </Badge>
    </IconButton>
  ) : (
    <Chip
      size="small"
      sx={{ fontWeight: 500 }}
      color={color}
      icon={indicator.icon}
      label={indicator.label}
      onClick={handleClick}
      tabIndex={0}
      aria-live="polite"
    />
  );

  return (
    <>
      <Tooltip
        title={compact ? `${indicator.label}. ${indicator.tooltip ?? ''}` : indicator.tooltip ?? ''}
        placement={compact ? 'right' : 'bottom'}
      >
        {badge}
      </Tooltip>
      {indicator.action === 'relogin' && (
        <ReloginDialog open={isReloginOpen} onOpenChange={setIsReloginOpen} />
      )}
    </>
  );
};
