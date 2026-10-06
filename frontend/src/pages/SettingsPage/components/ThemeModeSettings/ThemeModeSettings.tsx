import React, { useContext } from 'react';
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import BrightnessAutoIcon from '@mui/icons-material/BrightnessAuto';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import {
  ThemeModeContext,
  type ThemeMode,
} from '../../../../contexts/ThemeModeContext';

type ThemeModeOption = {
  value: ThemeMode;
  label: string;
  icon: React.ReactElement;
};

const THEME_MODE_OPTIONS: ThemeModeOption[] = [
  { value: 'light', label: 'Light', icon: <LightModeIcon fontSize="small" /> },
  { value: 'dark', label: 'Night', icon: <DarkModeIcon fontSize="small" /> },
  {
    value: 'auto',
    label: 'Auto',
    icon: <BrightnessAutoIcon fontSize="small" />,
  },
];

export const ThemeModeSettings: React.FC = () => {
  const { mode, setMode } = useContext(ThemeModeContext);

  const handleModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    nextMode: ThemeMode | null
  ): void => {
    if (nextMode !== null) {
      setMode(nextMode);
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Appearance
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose how Omega looks. Auto follows your system appearance.
      </Typography>
      <ToggleButtonGroup
        exclusive
        value={mode}
        onChange={handleModeChange}
        aria-label="Theme mode"
        size="small"
      >
        {THEME_MODE_OPTIONS.map(option => (
          <ToggleButton
            key={option.value}
            value={option.value}
            aria-label={`${option.label} theme`}
          >
            {option.icon}
            <Box component="span" sx={{ ml: 1 }}>
              {option.label}
            </Box>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};
