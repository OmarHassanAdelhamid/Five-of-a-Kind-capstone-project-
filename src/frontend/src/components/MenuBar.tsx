import { useState, useRef, useEffect } from 'react';

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
  canPaste?: boolean;
}

interface MenuItemConfig {
  label: string;
  handler?: (() => void) | null;
  shortcut?: string | null;
  subNote?: string;
  disabled?: boolean;
  hasSubmenu?: boolean;
}

interface MenuConfig {
  name: string;
  items: MenuItemConfig[];
}

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
  canPaste = false,
}: MenuBarProps) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [openFileSubmenu, setOpenFileSubmenu] = useState(false);
  const [openProjectSubmenu, setOpenProjectSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Debug: log state changes
  useEffect(() => {
    console.log('openFileSubmenu changed to:', openFileSubmenu);
  }, [openFileSubmenu]);

  useEffect(() => {
    console.log('openProjectSubmenu changed to:', openProjectSubmenu);
  }, [openProjectSubmenu]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
        setOpenFileSubmenu(false);
        setOpenProjectSubmenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleMenuItemClick = (handler?: (() => void) | null) => {
    if (handler) handler();
    setActiveMenu(null);
    setOpenFileSubmenu(false);
    setOpenProjectSubmenu(false);
  };

  const handleOpenFileHover = () => {
    console.log('Hover triggered, availableModels:', availableModels.length);
    if (availableModels.length > 0) {
      setOpenFileSubmenu(true);
      console.log('Set openFileSubmenu to true');
    }
  };

  const handleOpenFileLeave = () => {
    setOpenFileSubmenu(false);
  };

  const handleModelSelect = (modelName: string) => {
    if (onOpenFileSelect) {
      onOpenFileSelect(modelName);
    }
    setActiveMenu(null);
    setOpenFileSubmenu(false);
  };

  const handleOpenProjectHover = () => {
    if (availableProjects.length > 0 || onNewProject) {
      setOpenProjectSubmenu(true);
    }
  };

  const handleOpenProjectLeave = () => {
    setOpenProjectSubmenu(false);
  };

  const handleNewProjectClick = () => {
    if (onNewProject) {
      onNewProject();
    }
    setActiveMenu(null);
    setOpenProjectSubmenu(false);
  };

  const handleProjectSelect = (projectName: string) => {
    if (onOpenProjectSelect) {
      onOpenProjectSelect(projectName);
    }
    setActiveMenu(null);
    setOpenProjectSubmenu(false);
  };

  const menuItems: MenuConfig[] = [
    {
      name: 'File',
      items: [
        { 
          label: 'Open File...', 
          handler: availableModels.length > 0 ? undefined : onOpenFile, 
          shortcut: null,
          hasSubmenu: availableModels.length > 0,
        },
        { label: 'Upload File...', handler: onUploadFile, shortcut: null },
        { 
          label: 'Open Project...', 
          handler: (availableProjects.length > 0 || (onNewProject && selectedModel)) ? undefined : onOpenProject, 
          shortcut: null,
          hasSubmenu: availableProjects.length > 0 || (!!onNewProject && !!selectedModel),
        },
        { label: 'Save...', handler: onSave, shortcut: 'Ctrl S' },
        { label: 'Save as...', handler: onSaveAs, shortcut: null },
      ],
    },
    {
      name: 'Edit',
      items: [
        { label: 'Undo', handler: onUndo, shortcut: 'Ctrl Z', disabled: !canUndo },
        { label: 'Redo', handler: onRedo, shortcut: 'Ctrl Y', disabled: !canRedo },
        { label: 'Cut', handler: onCut, shortcut: 'Ctrl X', disabled: true },
        { label: 'Copy', handler: onCopy, shortcut: 'Ctrl C', disabled: true },
        { label: 'Paste', handler: onPaste, shortcut: 'Ctrl V', disabled: !canPaste },
        { label: 'Preferences', handler: onPreferences, shortcut: null, subNote: 'eg. colors of interface.' },
      ],
    },
    {
      name: 'View',
      items: [
        { label: 'Open Partition Menu', handler: onOpenPartitionMenu, shortcut: null },
        { label: 'Open Layer Menu', handler: onOpenLayerMenu, shortcut: null },
        { label: 'Highlight all...', handler: onHighlightAll, shortcut: null, subNote: 'eg. of a grid natural/magnet' },
      ],
    },
    {
      name: 'Selection',
      items: [
        { label: 'Select all', handler: onSelectAll, shortcut: 'Ctrl A' },
        { label: 'Reset selected voxels', handler: onResetSelected, shortcut: null },
      ],
    },
    {
      name: 'Help',
      items: [
        { label: 'View Manual', handler: onViewManual, shortcut: null },
        { label: 'License', handler: onLicense, shortcut: null },
        { label: 'Privacy Statement', handler: onPrivacy, shortcut: null },
        { label: 'About Version', handler: onAbout, shortcut: null },
        { label: 'Credits', handler: onCredits, shortcut: null },
      ],
    },
  ];

  return (
    <div className="menu-bar" ref={menuRef}>
      {menuItems.map((menu) => (
        <div key={menu.name} className="menu-item">
          <button
            className={`menu-button ${activeMenu === menu.name ? 'active' : ''}`}
            onClick={() => handleMenuClick(menu.name)}
          >
            {menu.name}
          </button>
          {activeMenu === menu.name && (
            <div className="menu-dropdown">
              {menu.items.map((item, idx) => {
                const hasFileSubmenu = item.hasSubmenu && item.label === 'Open File...';
                const hasProjectSubmenu = item.hasSubmenu && item.label === 'Open Project...';
                return (
                <div 
                  key={idx}
                  className={item.hasSubmenu ? 'menu-item-with-submenu' : ''}
                  onMouseEnter={
                    hasFileSubmenu
                      ? handleOpenFileHover 
                      : hasProjectSubmenu
                      ? handleOpenProjectHover
                      : undefined
                  }
                  onMouseLeave={
                    hasFileSubmenu
                      ? handleOpenFileLeave
                      : hasProjectSubmenu
                      ? handleOpenProjectLeave
                      : undefined
                  }
                >
                  <button
                    className="menu-dropdown-item"
                    onClick={() => handleMenuItemClick(item.handler)}
                    disabled={item.disabled || (!item.handler && !item.hasSubmenu)}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="menu-shortcut">{item.shortcut}</span>
                    )}
                    {item.hasSubmenu && (
                      <span className="menu-submenu-arrow">▶</span>
                    )}
                  </button>
                  {item.hasSubmenu && item.label === 'Open File...' && (
                    <div 
                      className={`menu-submenu ${openFileSubmenu ? 'menu-submenu-visible' : ''}`}
                      style={{ 
                        display: openFileSubmenu ? 'block' : 'none',
                        opacity: openFileSubmenu ? 1 : 0,
                        visibility: openFileSubmenu ? 'visible' : 'hidden'
                      }}
                      onMouseEnter={handleOpenFileHover}
                      onMouseLeave={handleOpenFileLeave}
                    >
                      {availableModels.length > 0 ? (
                        availableModels.map((model) => (
                          <button
                            key={model}
                            className="menu-submenu-item"
                            onClick={() => handleModelSelect(model)}
                          >
                            {model}
                          </button>
                        ))
                      ) : (
                        <div className="menu-submenu-item disabled">No models available</div>
                      )}
                    </div>
                  )}
                  {item.hasSubmenu && item.label === 'Open Project...' && (
                    <div 
                      className={`menu-submenu ${openProjectSubmenu ? 'menu-submenu-visible' : ''}`}
                      style={{ 
                        display: openProjectSubmenu ? 'block' : 'none',
                        opacity: openProjectSubmenu ? 1 : 0,
                        visibility: openProjectSubmenu ? 'visible' : 'hidden'
                      }}
                      onMouseEnter={handleOpenProjectHover}
                      onMouseLeave={handleOpenProjectLeave}
                    >
                      {onNewProject && selectedModel && (
                        <button
                          className="menu-submenu-item menu-submenu-item-new"
                          onClick={handleNewProjectClick}
                        >
                          New Project...
                        </button>
                      )}
                      {availableProjects.length > 0 && (
                        <>
                          {onNewProject && selectedModel && <div className="menu-submenu-divider"></div>}
                          {availableProjects.map((project) => (
                            <button
                              key={project}
                              className="menu-submenu-item"
                              onClick={() => handleProjectSelect(project)}
                            >
                              {project}
                            </button>
                          ))}
                        </>
                      )}
                      {availableProjects.length === 0 && (!onNewProject || !selectedModel) && (
                        <div className="menu-submenu-item disabled">No projects available</div>
                      )}
                    </div>
                  )}
                  {item.subNote && (
                    <div className="menu-subnote">{item.subNote}</div>
                  )}
                </div>
              );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
