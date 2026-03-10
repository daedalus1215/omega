import React from 'react';
import { useMediaQuery } from '@mui/material';
import { MonthViewDesktop } from './MonthViewDesktop';
import { MonthViewMobile } from './MonthViewMobile';
import { MonthViewProps } from './MonthView.types';

export const MonthView: React.FC<MonthViewProps> = (props) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return <MonthViewMobile {...props} />;
  }

  return <MonthViewDesktop {...props} />;
};
