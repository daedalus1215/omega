import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Paper } from '@mui/material';

type ResizablePanelProps = {
  children: React.ReactNode;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  onWidthChange?: (width: number) => void;
};

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  defaultWidth,
  minWidth = 200,
  maxWidth = 600,
  onWidthChange,
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      startX.current = e.pageX;
      startWidth.current = width;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;

      const delta = e.pageX - startX.current;
      const newWidth = Math.max(
        minWidth,
        Math.min(maxWidth, startWidth.current + delta)
      );

      setWidth(newWidth);
      onWidthChange?.(newWidth);
    },
    [maxWidth, minWidth, onWidthChange]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <Box sx={{ position: 'relative', width, flexShrink: 0 }}>
      <Paper
        elevation={0}
        sx={{
          height: '100%',
          backgroundColor: '#1a1a1a',
          borderRight: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        {children}
      </Paper>

      {/* Resize Handle */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: -4,
          width: 8,
          height: '100%',
          cursor: 'col-resize',
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
          '&:active': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          },
        }}
        onMouseDown={handleMouseDown}
      />
    </Box>
  );
};
