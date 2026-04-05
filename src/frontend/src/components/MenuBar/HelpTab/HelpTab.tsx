// This component is used to display the help tab of the menu bar (view manual, license, privacy statement, about version, credits)
import type { BaseTabProps } from '../types';

// Props for the HelpTab component
interface HelpTabProps extends BaseTabProps {
  onViewManual?: () => void;
  onLicense?: () => void;
  onPrivacy?: () => void;
  onAbout?: () => void;
  onCredits?: () => void;
}

export const HelpTab = ({
  isActive,
  onMenuClick,
  onClose,
  onViewManual,
  onLicense,
  onPrivacy,
  onAbout,
  onCredits,
}: HelpTabProps) => {
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
        Help
      </button>
      {isActive && (
        <div className="menu-dropdown">
          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onViewManual)}
            disabled={!onViewManual}
          >
            <span>View Manual</span>
          </button>

          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onLicense)}
            disabled={!onLicense}
          >
            <span>License</span>
          </button>

          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onPrivacy)}
            disabled={!onPrivacy}
          >
            <span>Privacy Statement</span>
          </button>

          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onAbout)}
            disabled={!onAbout}
          >
            <span>About Version</span>
          </button>

          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onCredits)}
            disabled={!onCredits}
          >
            <span>Credits</span>
          </button>
        </div>
      )}
    </div>
  );
};
