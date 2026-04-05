// This component is used to display the file tab of the menu bar (open file, open project, save, save as, export)
import { useState } from 'react';
import type { BaseTabProps } from '../types';

// Props for the FileTab component
interface FileTabProps extends BaseTabProps {
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
}

export const FileTab = ({
  isActive,
  onMenuClick,
  onClose,
  onOpenFileSelect,
  availableModels = [],
  onUploadFile,
  onOpenProject,
  onNewProject,
  onOpenProjectSelect,
  availableProjects = [],
  onSave,
  onSaveAs,
  onExport,
}: FileTabProps) => {
  const [openFileSubmenu, setOpenFileSubmenu] = useState(false);
  const [openProjectSubmenu, setOpenProjectSubmenu] = useState(false);

  // Handles the click on a menu item
  const handleItemClick = (handler?: (() => void) | null) => {
    if (handler) handler();
    onClose();
    setOpenFileSubmenu(false);
    setOpenProjectSubmenu(false);
  };

  // Handles the selection of a model
  const handleModelSelect = (modelName: string) => {
    if (onOpenFileSelect) onOpenFileSelect(modelName);
    onClose();
    setOpenFileSubmenu(false);
  };

  // Handles the selection of a project
  const handleProjectSelect = (projectName: string) => {
    if (onOpenProjectSelect) onOpenProjectSelect(projectName);
    onClose();
    setOpenProjectSubmenu(false);
  };

  return (
    <div className="menu-item">
      <button
        className={`menu-button ${isActive ? 'active' : ''}`}
        onClick={onMenuClick}
      >
        File
      </button>
      {isActive && (
        <div className="menu-dropdown">
          {availableModels.length > 0 && (
            <div
              className="menu-item-with-submenu"
              onMouseEnter={() => setOpenFileSubmenu(true)}
              onMouseLeave={() => setOpenFileSubmenu(false)}
            >
              <button className="menu-dropdown-item" disabled={false}>
                <span>Open File...</span>
                <span className="menu-submenu-arrow">▶</span>
              </button>
              <div
                className={`menu-submenu ${openFileSubmenu ? 'menu-submenu-visible' : ''}`}
                style={{
                  display: openFileSubmenu ? 'block' : 'none',
                  opacity: openFileSubmenu ? 1 : 0,
                  visibility: openFileSubmenu ? 'visible' : 'hidden',
                }}
                onMouseEnter={() => setOpenFileSubmenu(true)}
                onMouseLeave={() => setOpenFileSubmenu(false)}
              >
                {availableModels.map((model) => (
                  <button
                    key={model}
                    className="menu-submenu-item"
                    onClick={() => handleModelSelect(model)}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className="menu-item-with-submenu"
            onMouseEnter={() => setOpenProjectSubmenu(true)}
            onMouseLeave={() => setOpenProjectSubmenu(false)}
          >
            <button className="menu-dropdown-item">
              <span>Open Project...</span>
              <span className="menu-submenu-arrow">▶</span>
            </button>
            <div
              className={`menu-submenu ${openProjectSubmenu ? 'menu-submenu-visible' : ''}`}
              style={{
                display: openProjectSubmenu ? 'block' : 'none',
                opacity: openProjectSubmenu ? 1 : 0,
                visibility: openProjectSubmenu ? 'visible' : 'hidden',
              }}
              onMouseEnter={() => setOpenProjectSubmenu(true)}
              onMouseLeave={() => setOpenProjectSubmenu(false)}
            >
              {onUploadFile && (
                <button
                  className="menu-submenu-item"
                  onClick={() => handleItemClick(onUploadFile)}
                >
                  Import STL
                </button>
              )}
              {onNewProject && (
                <button
                  className="menu-submenu-item"
                  onClick={() => handleItemClick(onNewProject)}
                >
                  Create New Project
                </button>
              )}
              {onOpenProject && (
                <button
                  className="menu-submenu-item"
                  onClick={() => handleItemClick(onOpenProject)}
                >
                  Open Existing Project
                </button>
              )}
              {availableProjects.map((project) => (
                <button
                  key={project}
                  className="menu-submenu-item"
                  onClick={() => handleProjectSelect(project)}
                >
                  {project}
                </button>
              ))}
            </div>
          </div>

          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onSave)}
            disabled={!onSave}
          >
            <span>Save...</span>
            <span className="menu-shortcut">Ctrl S</span>
          </button>

          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onSaveAs)}
            disabled={!onSaveAs}
          >
            <span>Save as...</span>
          </button>

          <button
            className="menu-dropdown-item"
            onClick={() => handleItemClick(onExport)}
            disabled={!onExport}
          >
            <span>Export...</span>
            <span className="menu-shortcut">Ctrl E</span>
          </button>
        </div>
      )}
    </div>
  );
};
