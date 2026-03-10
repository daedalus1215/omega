import React from 'react';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Logout from '@mui/icons-material/Logout';
import Divider from '@mui/material/Divider';
import Fade from '@mui/material/Fade';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '../../Logo/Logo';
import { navigationItems } from './navigation-items';
import styles from './MobileSidebar.module.css';

type MobileSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onSignOut?: () => void;
  username?: string;
};

export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  onClose,
  onSignOut,
  username,
}) => {
  const location = useLocation();

  // Helper function to determine if a route is active
  const isRouteActive = React.useCallback(
    (itemPath: string) => {
      const pathname = location.pathname;
      if (itemPath === '/') {
        return pathname === '/' || pathname === '/calendar';
      }
      return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
    },
    [location.pathname]
  );

  return (
    <Drawer
      anchor="left"
      open={isOpen}
      onClose={onClose}
      variant="temporary"
      sx={{
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
        },
      }}
    >
      <div
        className={styles.header}
        style={{ display: 'flex', alignItems: 'center', padding: '1rem' }}
      >
        <Link
          to="/"
          className={styles.brand}
          style={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: 'inherit',
            flexGrow: 1,
          }}
          onClick={onClose}
        >
          <Logo />
          <span
            className={styles.name}
            style={{ marginLeft: 8, fontWeight: 600, fontSize: '1.2rem' }}
          >
            Alpha-Omega
          </span>
        </Link>
        <IconButton onClick={onClose} aria-label="Close sidebar">
          <CloseIcon />
        </IconButton>
      </div>
      <List>
        {navigationItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = isRouteActive(item.path);

          return (
            <Fade
              key={item.path}
              in={isOpen}
              timeout={300}
              style={{
                transitionDelay: `${Math.min(index * 50, 300)}ms`,
              }}
            >
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  onClick={onClose}
                  selected={isActive}
                  sx={{
                    backgroundColor: isActive
                      ? 'action.selected'
                      : 'transparent',
                    '&:hover': {
                      backgroundColor: isActive
                        ? 'action.selected'
                        : 'action.hover',
                    },
                    borderRadius: '8px',
                    margin: '0 8px',
                    padding: '8px 16px',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    <Icon />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'primary.main' : 'text.primary',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </Fade>
          );
        })}
      </List>
      {onSignOut != null && (
        <>
          <Divider />
          <List>
            {username != null && (
              <ListItem sx={{ py: 0, px: 2 }}>
                <ListItemText
                  secondary={username}
                  secondaryTypographyProps={{
                    sx: { fontSize: '0.75rem' },
                    color: 'text.secondary',
                  }}
                />
              </ListItem>
            )}
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
                sx={{
                  borderRadius: '8px',
                  margin: '0 8px',
                  padding: '8px 16px',
                }}
              >
                <ListItemIcon sx={{ color: 'text.secondary' }}>
                  <Logout />
                </ListItemIcon>
                <ListItemText primary="Sign Out" />
              </ListItemButton>
            </ListItem>
          </List>
        </>
      )}
    </Drawer>
  );
};
