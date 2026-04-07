/**
 * View menu: toggles for layer view, partitions, and related UI.
 *
 * @author Andrew Bovbel
 * @lastModified 2026/04/05
 */
import type { BaseTabProps } from '../types';

// Props for the ViewTab component
interface ViewTabProps extends BaseTabProps {
  onOpenPartitionMenu?: () => void;
  onOpenLayerMenu?: () => void;
  onHighlightAll?: () => void;
}

export const ViewTab = ({
  isActive,
  onMenuClick,
  onClose,
  onOpenPartitionMenu,
  onOpenLayerMenu,
  onHighlightAll,
}: ViewTabProps) => {
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
        View
      </button>
      {isActive && (
        <div className="menu-dropdown">
          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onOpenPartitionMenu)}
            disabled={!onOpenPartitionMenu}
          >
            <span>Open Partition Menu</span>
          </button>

          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onOpenLayerMenu)}
            disabled={!onOpenLayerMenu}
          >
            <span>Open Layer Menu</span>
          </button>

          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onHighlightAll)}
            disabled={!onHighlightAll}
          >
            <span>Highlight all...</span>
          </button>
          <div className="menu-subnote">eg. of a grid natural/magnet</div>
        </div>
      )}
    </div>
  );
};
