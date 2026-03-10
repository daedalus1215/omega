import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { Sidebar } from './Sidebar/Sidebar';
import { Logo } from '../Logo/Logo';
import { useSidebar } from '../../hooks/useSidebar';
import { ROUTES } from '../../constants/routes';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import styles from './Header.module.css';

export const MOBILE_HEADER_HEIGHT_PX = 48;

export const Header: React.FC = () => {
  const { logout, user } = useAuth();
  const { isOpen, setIsOpen, isMobile } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const isCalendarPage = location.pathname === ROUTES.HOME || location.pathname === ROUTES.CALENDAR;

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => (isMobile ? setIsOpen(!isOpen) : navigate('/'));

  if (isMobile) {
    return (
      <>
        {!isCalendarPage && (
          <>
            <header
              className={`${styles.header} ${styles.mobile}`}
              style={{ height: MOBILE_HEADER_HEIGHT_PX }}
            >
              <div className={styles.container}>
                <IconButton
                  onClick={toggleSidebar}
                  aria-label="Open menu"
                  size="small"
                  sx={{ color: 'text.primary' }}
                >
                  <MenuIcon fontSize="small" />
                </IconButton>
              </div>
            </header>
            <Sidebar
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onSignOut={handleSignOut}
              username={user?.username}
            />
          </>
        )}
      </>
    );
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          <button onClick={toggleSidebar} className={styles.brand}>
            <Logo />
            <span className={styles.name}>Alpha-Omega</span>
          </button>
          <div className={styles.rightSection}>
            <span className={styles.username}>{user?.username}</span>
            <button onClick={handleSignOut} className={styles.signOutButton}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <Sidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
