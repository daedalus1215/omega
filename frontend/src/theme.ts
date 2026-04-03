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
});
