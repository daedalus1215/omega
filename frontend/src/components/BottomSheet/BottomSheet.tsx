import React from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Optionally, add a maxHeight or custom className prop if you want
};

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
}) => (
  <Drawer
    anchor="bottom"
    open={isOpen}
    onClose={(_event, reason) => {
      // This prevents the drawer from closing when typing in inputs or when focus changes
      if (reason === 'escapeKeyDown' || reason === 'backdropClick') {
        onClose();
      }
      // Explicitly ignore backdrop clicks and other reasons to prevent issues
    }}
    slotProps={{
      paper: {
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: '80vh',
          margin: '10 auto',
        },
      },
    }}
  >
    <Box sx={{ p: 2 }}>{children}</Box>
  </Drawer>
);
