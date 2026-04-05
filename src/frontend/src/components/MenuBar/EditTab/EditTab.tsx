// This component is used to display the edit tab of the menu bar (undo, redo, cut, copy, paste, preferences)
import type { BaseTabProps } from '../types';

// Props for the EditTab component
interface EditTabProps extends BaseTabProps {
  canCut?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onPreferences?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  canPaste?: boolean;
  canCopy?: boolean;
}

export const EditTab = ({
  isActive,
  onMenuClick,
  onClose,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onPreferences,
  canUndo = false,
  canRedo = false,
  canCut = false,
  canPaste = false,
  canCopy = false,
}: EditTabProps) => {
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
        Edit
      </button>
      {isActive && (
        <div className="menu-dropdown">
          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onUndo)}
            disabled={!canUndo}
          >
            <span>Undo</span>
            <span className="menu-shortcut">Ctrl Z</span>
          </button>

          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onRedo)}
            disabled={!canRedo}
          >
            <span>Redo</span>
            <span className="menu-shortcut">Ctrl Y</span>
          </button>

          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onCut)}
            disabled={!canCut}
          >
            <span>Cut</span>
            <span className="menu-shortcut">Ctrl X</span>
          </button>

          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onCopy)}
            disabled={!canCopy}
          >
            <span>Copy</span>
            <span className="menu-shortcut">Ctrl C</span>
          </button>

          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onPaste)}
            disabled={!canPaste}
          >
            <span>Paste</span>
            <span className="menu-shortcut">Ctrl V</span>
          </button>

          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onPreferences)}
            disabled={!onPreferences}
          >
            <span>Preferences</span>
          </button>
          <div className="menu-subnote">eg. colors of interface.</div>
        </div>
      )}
    </div>
  );
};
