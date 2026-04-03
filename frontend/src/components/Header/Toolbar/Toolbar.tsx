import React from 'react';
import { Box, IconButton, InputAdornment, TextField } from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  FormatBold,
  FormatItalic,
  FormatListBulleted,
  Code,
} from '@mui/icons-material';

type ToolbarProps = {
  onSearch?: (query: string) => void;
  onNewNote?: () => void;
};

export const Toolbar: React.FC<ToolbarProps> = ({ onSearch, onNewNote }) => {
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearch?.(event.target.value);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.default',
      }}
    >
      {/* Search Bar */}
      <TextField
        size="small"
        placeholder="Search notes..."
        variant="outlined"
        onChange={handleSearchChange}
        sx={{
          flex: 1,
          maxWidth: 300,
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'background.paper',
            color: 'text.primary',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'text.secondary',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'divider',
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
        }}
      />

      {/* New Note Button */}
      <IconButton
        onClick={onNewNote}
        sx={{
          color: 'primary.contrastText',
          backgroundColor: 'primary.main',
          '&:hover': {
            backgroundColor: 'primary.dark',
          },
        }}
      >
        <AddIcon />
      </IconButton>

      {/* Formatting Tools */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <IconButton size="small" sx={{ color: 'text.primary' }}>
          <FormatBold />
        </IconButton>
        <IconButton size="small" sx={{ color: 'text.primary' }}>
          <FormatItalic />
        </IconButton>
        <IconButton size="small" sx={{ color: 'text.primary' }}>
          <FormatListBulleted />
        </IconButton>
        <IconButton size="small" sx={{ color: 'text.primary' }}>
          <Code />
        </IconButton>
      </Box>
    </Box>
  );
};
