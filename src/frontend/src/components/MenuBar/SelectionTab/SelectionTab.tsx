/**
 * Selection menu: highlight all, invert, and partition/layer-related selection actions.
 *
 * @author Andrew Bovbel
 * @lastModified 2026/04/05
 */
import type { BaseTabProps } from '../types';

// Props for the SelectionTab component
interface SelectionTabProps extends BaseTabProps {
  onSelectAll?: () => void;
  onResetSelected?: () => void;
}

export const SelectionTab = ({
  isActive,
  onMenuClick,
  onClose,
  onSelectAll,
  onResetSelected,
}: SelectionTabProps) => {
  // Handles the click on a menu item
  const handleItemClick = (handler?: (() => void) | null) => {
    if (handler) handler();
    onClose();
  };

  return (
    <div className="menu-item">
      <button
        className={`menu-button ${isActive ? 'active' : ''}`}
        onClick={onMenuClick}
      >
        Selection
      </button>
      {isActive && (
        <div className="menu-dropdown">
          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onSelectAll)}
            disabled={!onSelectAll}
          >
            <span>Select all</span>
            <span className="menu-shortcut">Ctrl A</span>
          </button>

          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onResetSelected)}
            disabled={!onResetSelected}
          >
            <span>Reset selected voxels</span>
          </button>
        </div>
      )}
    </div>
  );
};
