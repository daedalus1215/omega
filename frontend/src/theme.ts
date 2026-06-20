import { createTheme } from '@mui/material/styles';

export const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6366f1',
      dark: '#4f46e5',
      light: '#818cf8',
      contrastText: '#ffffff',
    },
    secondary: { main: '#ca8a04' },
    error: { main: '#dc2626' },
    success: { main: '#10b981' },
    background: { default: '#fafafa', paper: '#ffffff' },
    text: { primary: '#18181b', secondary: '#71717a' },
    divider: '#e4e4e7',
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
    fontSize: 16,
  },
  // Centralized menu/dropdown surface styling so every Select, Menu and
  // ToggleButtonGroup shares the same radius, hover, elevation and motion.
  // Components should rely on these instead of re-styling in CSS modules.
  components: {
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 10,
          border: `1px solid ${theme.palette.divider}`,
          marginTop: 6,
          boxShadow:
            '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
        }),
        list: {
          paddingTop: 4,
          paddingBottom: 4,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 6,
          marginInline: 4,
          transition: theme.transitions.create(['background-color', 'color'], {
            duration: 120,
          }),
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            color: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: 'rgba(99, 102, 241, 0.18)',
            },
          },
        }),
      },
    },
    MuiSelect: {
      defaultProps: {
        // One consistent anchor/transform for every dropdown in the app.
        MenuProps: {
          anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
          transformOrigin: { vertical: 'top', horizontal: 'left' },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          borderRadius: 8,
          padding: 2,
          gap: 2,
        }),
        grouped: {
          border: 0,
          borderRadius: '6px !important',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none',
          fontWeight: 500,
          color: theme.palette.text.secondary,
          padding: '4px 14px',
          transition: theme.transitions.create(['background-color', 'color'], {
            duration: 150,
          }),
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
          '&.Mui-selected': {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
          },
          '&.Mui-disabled': {
            border: 0,
          },
        }),
      },
    },
  },
});
