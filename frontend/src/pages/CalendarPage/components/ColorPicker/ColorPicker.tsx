import React from 'react';
import { Box, FormControl, FormLabel, Typography, Tooltip } from '@mui/material';
import {
  EVENT_COLORS,
  EventColorKey,
  DEFAULT_EVENT_COLOR_KEY,
} from '../../constants/calendar.constants';

type ColorPickerProps = {
  value?: string;
  onChange: (color: string) => void;
  isEditing: boolean;
  disabled?: boolean;
};

const getColorKeyFromValue = (value?: string): EventColorKey | null => {
  if (!value) return null;
  const entry = Object.entries(EVENT_COLORS).find(
    ([_, color]) => color.value === value
  );
  return entry ? (entry[0] as EventColorKey) : null;
};

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  isEditing,
  disabled = false,
}) => {
  const selectedColorKey = getColorKeyFromValue(value);

  if (!isEditing) {
    if (!value) return null;
    const colorData = EVENT_COLORS[selectedColorKey || DEFAULT_EVENT_COLOR_KEY];
    return (
      <Box>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
          Color:
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: 1,
              backgroundColor: colorData.value,
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {colorData.name}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <FormControl fullWidth disabled={disabled}>
      <FormLabel>Event Color</FormLabel>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          mt: 1,
        }}
      >
        {Object.entries(EVENT_COLORS).map(([key, color]) => {
          const isSelected = value === color.value;
          return (
            <Tooltip key={key} title={color.name} arrow>
              <Box
                onClick={() => !disabled && onChange(color.value)}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  backgroundColor: color.value,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  border: isSelected ? '2px solid' : '1px solid',
                  borderColor: isSelected ? 'white' : 'divider',
                  boxShadow: isSelected ? '0 0 0 2px ' + color.value : 'none',
                  opacity: disabled ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                  '&:hover': disabled
                    ? {}
                    : {
                        transform: 'scale(1.1)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      },
                }}
              />
            </Tooltip>
          );
        })}
      </Box>
    </FormControl>
  );
};
