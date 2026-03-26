import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { Sidebar } from './Sidebar/Sidebar';
import { Logo } from '../Logo/Logo';
import { useSidebar } from '../../hooks/useSidebar';
import { ROUTES } from '../../constants/routes';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import { CalendarContext } from '../../contexts/CalendarContext';
import styles from './Header.module.css';

export const MOBILE_HEADER_HEIGHT_PX = 48;

export const Header: React.FC = () => {
  const { logout, user } = useAuth();
  const { isOpen, setIsOpen, isMobile } = useSidebar();
  const navigate = useNavigate();
  const { calendarMonthLabel } = useContext(CalendarContext);

  const handleSignOut = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  const toggleSidebar = () => (isMobile ? setIsOpen(!isOpen) : navigate('/'));

  if (isMobile) {
    return (
      <>
        <header
          className={`${styles.header} ${styles.mobile}`}
          style={{ height: MOBILE_HEADER_HEIGHT_PX }}
        >
          <div className={`${styles.container} ${styles.mobileToolbarRow}`}>
            <IconButton
              onClick={toggleSidebar}
              aria-label="Open menu"
              sx={{ color: 'text.primary' }}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
            <span className={styles.calendarMonthLabel} aria-live="polite">
              {calendarMonthLabel}
            </span>
            <span className={styles.mobileHeaderSpacer} aria-hidden />
          </div>
        </header>
        <Sidebar
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSignOut={handleSignOut}
          username={user?.username}
        />
      </>
    );
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          <button onClick={toggleSidebar} className={styles.brand}>
            <Logo />
            <span className={styles.name}>Omega</span>
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
