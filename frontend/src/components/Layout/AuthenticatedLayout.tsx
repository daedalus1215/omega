import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Paper } from '@mui/material';
import { Header, MOBILE_HEADER_HEIGHT_PX } from '../Header/Header';
import { DesktopSidebar } from '../Header/Sidebar/DesktopSidebar';
import { useIsMobile } from '../../hooks/useIsMobile';
import { CalendarProvider } from '../../contexts/CalendarContext';

export const AuthenticatedLayout: React.FC = () => {
  const isMobile = useIsMobile();
  const showMobileHeader = isMobile;

  return (
    <CalendarProvider>
      {showMobileHeader && <Header />}
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: showMobileHeader ? MOBILE_HEADER_HEIGHT_PX : 0,
          height: showMobileHeader
            ? `calc(100vh - ${MOBILE_HEADER_HEIGHT_PX}px)`
            : '100vh',
          width: '100%',
        }}
      >
        {isMobile ? (
          <Box
            sx={{
              height: '100%',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Outlet />
          </Box>
        ) : (
          <Box
            sx={{ display: 'flex', width: '100%', height: '100%', minWidth: 0 }}
          >
            {/* Sidebar - persists across all pages */}
            <Paper
              elevation={0}
              sx={{
                flex: '0 0 auto',
                borderRight: '1px solid',
                borderColor: 'divider',
                backgroundColor: '#111',
                height: '100%',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <DesktopSidebar isOpen={true} />
            </Paper>

            {/* Page-specific content */}
            <Box sx={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
              <Outlet />
            </Box>
          </Box>
        )}
      </main>
    </CalendarProvider>
  );
};
