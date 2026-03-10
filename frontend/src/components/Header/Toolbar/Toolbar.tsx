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
        backgroundColor: '#1a1a1a',
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
            backgroundColor: '#2a2a2a',
            color: '#fff',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
            </InputAdornment>
          ),
        }}
      />

      {/* New Note Button */}
      <IconButton
        onClick={onNewNote}
        sx={{
          color: '#fff',
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
        <IconButton size="small" sx={{ color: '#fff' }}>
          <FormatBold />
        </IconButton>
        <IconButton size="small" sx={{ color: '#fff' }}>
          <FormatItalic />
        </IconButton>
        <IconButton size="small" sx={{ color: '#fff' }}>
          <FormatListBulleted />
        </IconButton>
        <IconButton size="small" sx={{ color: '#fff' }}>
          <Code />
        </IconButton>
      </Box>
    </Box>
  );
};
