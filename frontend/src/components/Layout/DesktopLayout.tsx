import React, { useState } from 'react';
import Box from '@mui/material/Box';
import { Paper } from '@mui/material';
import { DesktopSidebar } from '../Header/Sidebar/DesktopSidebar';
import { Toolbar } from '../Header/Toolbar/Toolbar';
import { ResizablePanel } from './ResizablePanel';

type DesktopLayoutProps = {
  noteList: React.ReactNode;
  noteContent?: React.ReactNode;
  onSearch?: (query: string) => void;
  onNewNote?: () => void;
};

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  noteList,
  noteContent,
  onSearch,
  onNewNote,
}) => {
  const [noteListWidth, setNoteListWidth] = useState(300);

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        backgroundColor: 'background.default',
        color: 'text.primary',
      }}
    >
      {/* Navigation Sidebar */}
      <Paper
        elevation={0}
        sx={{
          flex: '0 0 auto',
          borderRight: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <DesktopSidebar isOpen={true} />
      </Paper>

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Top Toolbar */}
        <Paper
          elevation={0}
          sx={{
            flexShrink: 0,
            backgroundColor: 'background.default',
            zIndex: 1200,
          }}
        >
          <Toolbar onSearch={onSearch} onNewNote={onNewNote} />
        </Paper>

        {/* Content Area */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Note List Panel */}
          <ResizablePanel
            defaultWidth={noteListWidth}
            minWidth={250}
            maxWidth={500}
            onWidthChange={setNoteListWidth}
          >
            {noteList}
          </ResizablePanel>

          {/* Note Content Panel */}
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              backgroundColor: 'background.default',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {noteContent}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};
