import React from 'react';
import { useSidebar } from '../../../hooks/useSidebar';
import { MobileSidebar } from './MobileSidebar';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onSignOut?: () => void;
  username?: string;
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onSignOut,
  username,
}) => {
  const { isMobile } = useSidebar();

  if (isMobile) {
    return (
      <MobileSidebar
        isOpen={isOpen}
        onClose={onClose}
        onSignOut={onSignOut}
        username={username}
      />
    );
  }
  // Desktop sidebar is rendered inside page layouts (e.g., HomePage) to
  // participate in the same flex row as the content.
  return null;
};
