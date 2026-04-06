/**
 * Top application menu bar composing File, Edit, View, Selection, and Help tabs.
 *
 * @author Andrew Bovbel
 * @lastModified 2026/04/05
 */
import { useState, useRef, useEffect } from 'react';
import { FileTab } from './FileTab/FileTab';
import { EditTab } from './EditTab/EditTab';
import { ViewTab } from './ViewTab/ViewTab';
import { SelectionTab } from './SelectionTab/SelectionTab';
import { HelpTab } from './HelpTab/HelpTab';

// Props for the MenuBar component
interface MenuBarProps {
  onOpenFile?: () => void;
  onOpenFileSelect?: (modelName: string) => void;
  availableModels?: string[];
  onUploadFile?: () => void;
  onOpenProject?: () => void;
  onNewProject?: () => void;
  onOpenProjectSelect?: (projectName: string) => void;
  availableProjects?: string[];
  selectedModel?: string | null;
  onSave?: () => void;
  onSaveAs?: () => void;
  onExport?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onPreferences?: () => void;
  onOpenPartitionMenu?: () => void;
  onOpenLayerMenu?: () => void;
  onHighlightAll?: () => void;
  onSelectAll?: () => void;
  onResetSelected?: () => void;
  onViewManual?: () => void;
  onLicense?: () => void;
  onPrivacy?: () => void;
  onAbout?: () => void;
  onCredits?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  canCut?: boolean;
  canPaste?: boolean;
  canCopy?: boolean;
}

// Names of the tabs in the menu bar
type TabName = 'File' | 'Edit' | 'View' | 'Selection' | 'Help';

export const MenuBar = ({
  onOpenFile,
  onOpenFileSelect,
  availableModels = [],
  onUploadFile,
  onOpenProject,
  onNewProject,
  onOpenProjectSelect,
  availableProjects = [],
  selectedModel = null,
  onSave,
  onSaveAs,
  onExport,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onPreferences,
  onOpenPartitionMenu,
  onOpenLayerMenu,
  onHighlightAll,
  onSelectAll,
  onResetSelected,
  onViewManual,
  onLicense,
  onPrivacy,
  onAbout,
  onCredits,
  canUndo = false,
  canRedo = false,
  canCut = false,
  canPaste = false,
  canCopy = false,
}: MenuBarProps) => {
  const [activeMenu, setActiveMenu] = useState<TabName | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // If you click outside the menu bar, close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handles the click on a menu item
  const handleMenuClick = (name: TabName) => {
    setActiveMenu(activeMenu === name ? null : name);
  };

  // Handles the closing of a menu item
  const handleClose = () => setActiveMenu(null);

  return (
    <div className="menu-bar" ref={menuRef}>
      <div className="menu-bar-brand">
        <span className="menu-bar-brand-icon-wrap" aria-hidden="true">
          <img
            className="menu-bar-brand-icon"
            src="/autovox-gear.svg"
            alt=""
            width={18}
            height={18}
            draggable={false}
          />
        </span>
        <span className="menu-bar-brand-text">AutoVox</span>
      </div>

      <FileTab
        isActive={activeMenu === 'File'}
        onMenuClick={() => handleMenuClick('File')}
        onClose={handleClose}
        onOpenFile={onOpenFile}
        onOpenFileSelect={onOpenFileSelect}
        availableModels={availableModels}
        onUploadFile={onUploadFile}
        onOpenProject={onOpenProject}
        onNewProject={onNewProject}
        onOpenProjectSelect={onOpenProjectSelect}
        availableProjects={availableProjects}
        selectedModel={selectedModel}
        onSave={onSave}
        onSaveAs={onSaveAs}
        onExport={onExport}
      />

      <EditTab
        isActive={activeMenu === 'Edit'}
        onMenuClick={() => handleMenuClick('Edit')}
        onClose={handleClose}
        onUndo={onUndo}
        onRedo={onRedo}
        onCut={onCut}
        onCopy={onCopy}
        onPaste={onPaste}
        onPreferences={onPreferences}
        canUndo={canUndo}
        canRedo={canRedo}
        canCut={canCut}
        canPaste={canPaste}
        canCopy={canCopy}
      />

      <ViewTab
        isActive={activeMenu === 'View'}
        onMenuClick={() => handleMenuClick('View')}
        onClose={handleClose}
        onOpenPartitionMenu={onOpenPartitionMenu}
        onOpenLayerMenu={onOpenLayerMenu}
        onHighlightAll={onHighlightAll}
      />

      <SelectionTab
        isActive={activeMenu === 'Selection'}
        onMenuClick={() => handleMenuClick('Selection')}
        onClose={handleClose}
        onSelectAll={onSelectAll}
        onResetSelected={onResetSelected}
      />

      <HelpTab
        isActive={activeMenu === 'Help'}
        onMenuClick={() => handleMenuClick('Help')}
        onClose={handleClose}
        onViewManual={onViewManual}
        onLicense={onLicense}
        onPrivacy={onPrivacy}
        onAbout={onAbout}
        onCredits={onCredits}
      />
    </div>
  );
};
