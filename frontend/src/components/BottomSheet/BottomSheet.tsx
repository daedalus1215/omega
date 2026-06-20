import React from 'react';
import Drawer from '@mui/material/Drawer';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import { useIsMobile } from '../../hooks/useIsMobile';

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

// Only escape / backdrop should dismiss — never an input focus change etc.
const isDismissReason = (reason: string) =>
  reason === 'escapeKeyDown' || reason === 'backdropClick';

/**
 * Primary modal container for the calendar app. Responsive by design:
 *  - mobile: a bottom sheet (Drawer) with a drag-grabber, thumb-reachable
 *  - desktop: a centered Dialog, the conventional large-screen pattern
 * Both expose the same isOpen / onClose / children API.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <Dialog
        open={isOpen}
        onClose={(_event, reason) => {
          if (isDismissReason(reason)) onClose();
        }}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: { borderRadius: 3 },
          },
        }}
      >
        {/* Dialog paper scrolls on its own; just pad the content. */}
        <Box sx={{ p: 2 }}>{children}</Box>
      </Dialog>
    );
  }

  return (
    <Drawer
      anchor="bottom"
      open={isOpen}
      onClose={(_event, reason) => {
        if (isDismissReason(reason)) onClose();
      }}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* Drag affordance / grabber, pinned above the scroll area */}
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
          pt: 1,
          pb: 0.5,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: 'divider',
          }}
        />
      </Box>
      {/* flex:1 + minHeight:0 lets this scroll inside the capped-height paper */}
      <Box sx={{ p: 2, flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {children}
      </Box>
    </Drawer>
  );
};
