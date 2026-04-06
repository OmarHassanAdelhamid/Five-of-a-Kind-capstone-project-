/**
 * Shared TypeScript types for menu bar callbacks and options.
 *
 * @author Khalid Farag
 * @lastModified 2026/04/05
 */
export interface BaseTabProps {
  isActive: boolean;
  onMenuClick: () => void;
  onClose: () => void;
}
