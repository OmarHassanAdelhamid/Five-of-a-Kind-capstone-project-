// This file contains the types for the menu bar
export interface BaseTabProps {
  isActive: boolean;
  onMenuClick: () => void;
  onClose: () => void;
}
