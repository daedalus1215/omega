import { createContext } from 'react';

type SidebarContextType = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isMobile: boolean;
};

export const SidebarContext = createContext<SidebarContextType | undefined>(
  undefined
);
