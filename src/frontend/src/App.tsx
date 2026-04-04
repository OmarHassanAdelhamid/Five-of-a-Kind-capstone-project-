import { useCallback, useEffect, useState, useRef } from 'react';
import './App.css';
import { ModelViewer } from './components/ModelViewer/ModelViewer';
import { MenuBar } from './components/MenuBar/MenuBar';
import { NewProjectDialog } from './components/ProjectSettings/NewProjectDialog/NewProjectDialog.tsx';
import { WelcomeModal } from './components/ProjectSettings/WelcomeModal';
import { PartitionsPanel } from './components/PartitionPanel/PartitionsPanel';
import {
  fetchAvailableModels,
  fetchAvailableProjects,
  fetchPartitions,
  fetchVoxelized,
  uploadSTLFile,
  voxelizeModel,
  downloadVoxelCSV,
  updateHistory,
  clearHistory,
  type VoxelPropertiesClipboard,
} from './utils/api';
import type { LayerEditorHandle } from './components/LayerEditor';

function App() {
  /** Drives StatusMessage while /api/project voxel payload is loading (parent state; ModelViewer owns STL mesh status). */
  const [projectFetchStatus, setProjectFetchStatus] = useState<
    'idle' | 'loading' | 'error'
  >('idle');
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>(
    () => sessionStorage.getItem('projectName') ?? '',
  );
  const [selectedPartition, setSelectedPartition] = useState<string | null>(
    () => sessionStorage.getItem('selectedPartition'),
  );
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [voxelCoordinates, setVoxelCoordinates] = useState<number[][]>([]);
  const [voxelSize, setVoxelSize] = useState<number>(0.1);
  const [selectedLayerZ, setSelectedLayerZ] = useState<number | null>(null);
  const [selectedVoxel, setSelectedVoxel] = useState<{
    coord: number[];
    index: number;
  } | null>(null);
  const [selectedVoxels, setSelectedVoxels] = useState<Set<number>>(new Set());

  // Convert Set to sorted array for dependency tracking
  const selectedVoxelIndicesArray = Array.from(selectedVoxels).sort();
  const [isLayerEditingMode, setIsLayerEditingMode] = useState(false);
  const [isLayerEditorOpen, setIsLayerEditorOpen] = useState(false);
  const [layerAxis] = useState<'z' | 'x' | 'y'>('y');
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [isPartitionsPanelOpen, setIsPartitionsPanelOpen] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [welcomeInitialStep, setWelcomeInitialStep] = useState<
    | 'choice'
    | 'select-model'
    | 'select-project'
    | 'select-file'
    | 'select-previous'
  >('choice');

  const handleWelcomeImportSTL = () => {
    fileInputRef.current?.click();
  };

  const handleWelcomeNewProject = () => {
    setWelcomeInitialStep('select-model');
    setShowWelcomeModal(true);
  };

  const handleWelcomeExistingProject = () => {
    setWelcomeInitialStep('select-previous');
    setShowWelcomeModal(true);
  };

  const dismissWelcomeModal = useCallback(() => {
    sessionStorage.setItem('welcomeModalDismissed', 'true');
    setShowWelcomeModal(false);
  }, []);
  const [copiedVoxelProperties, setCopiedVoxelProperties] =
    useState<VoxelPropertiesClipboard | null>(null);
  const modelViewerRef = useRef<LayerEditorHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchModels = useCallback(async (): Promise<string[]> => {
    try {
      const modelList = await fetchAvailableModels();
      setModels(modelList);
      return modelList;
    } catch (error) {
      console.error('Failed to fetch STL models', error);
      setModels([]);
      throw error;
    }
  }, []);

  const fetchProjects = useCallback(async (): Promise<string[]> => {
    try {
      const projectList = await fetchAvailableProjects();
      setAvailableProjects(projectList);
      return projectList;
    } catch (error) {
      console.error('Failed to fetch available projects', error);
      setAvailableProjects([]);
      return [];
    }
  }, []);

  const fetchVoxels = useCallback(
    async (project: string, partition: string) => {
      try {
        const coordinates = await fetchVoxelized(project, partition);
        setVoxelCoordinates(coordinates);
        return coordinates;
      } catch (error) {
        console.error('Failed to fetch voxelized coordinates', error);
        setVoxelCoordinates([]);
        throw error;
      }
    },
    [],
  );

  // Persist project state so it survives page refreshes
  useEffect(() => {
    if (projectName) {
      sessionStorage.setItem('projectName', projectName);
    } else {
      sessionStorage.removeItem('projectName');
    }
  }, [projectName]);

  useEffect(() => {
    if (selectedPartition) {
      sessionStorage.setItem('selectedPartition', selectedPartition);
    } else {
      sessionStorage.removeItem('selectedPartition');
    }
  }, [selectedPartition]);

  // Restore project from session on mount
  useEffect(() => {
    const savedProject = sessionStorage.getItem('projectName');
    const savedPartition = sessionStorage.getItem('selectedPartition');
    if (savedProject && savedPartition) {
      setProjectFetchStatus('loading');
      fetchVoxels(savedProject, savedPartition)
        .then((coords) => {
          setProjectFetchStatus(coords.length > 0 ? 'idle' : 'error');
        })
        .catch(() => setProjectFetchStatus('error'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const initialiseModels = async () => {
      const loadingProjectVoxels = Boolean(
        projectName.trim() && selectedPartition,
      );

      try {
        const modelList = await fetchModels();
        if (!loadingProjectVoxels) {
          if (modelList.length > 0) {
            if (
              !showWelcomeModal &&
              !projectName.trim() &&
              !isNewProjectDialogOpen
            ) {
              setSelectedModel((current) =>
                current && modelList.includes(current) ? current : modelList[0],
              );
            }
          } else if (!isNewProjectDialogOpen) {
            setSelectedModel(null);
          }
        }
      } catch {
        if (!loadingProjectVoxels && !isNewProjectDialogOpen) {
          setSelectedModel(null);
        }
      }
    };

    void initialiseModels();
    void fetchProjects();
  }, [
    fetchModels,
    fetchProjects,
    showWelcomeModal,
    projectName,
    isNewProjectDialogOpen,
    selectedPartition,
  ]);

  const handleStatusChange = useCallback(() => {
    /* Status banner for STL mesh loads is merged inside ModelViewer (viewerStatus). */
  }, []);

  const handleModelChange = useCallback((model: string) => {
    setSelectedModel(model);
    setProjectName('');
    setVoxelCoordinates([]);
    setSelectedLayerZ(null);
    setSelectedVoxel(null);
    setSelectedVoxels(new Set());
  }, []);

  const handleLoadVoxels = useCallback(
    async (project?: string, partition?: string) => {
      const projectToLoad = project || projectName;
      const partitionToLoad = partition || selectedPartition;
      if (!projectToLoad.trim() || !partitionToLoad) {
        return;
      }

      try {
        setProjectFetchStatus('loading');
        setSelectedModel(null); // Clear STL model when loading project - show voxels only
        setVoxelCoordinates([]);
        setSelectedLayerZ(null); // Clear layer selection when loading new project
        setSelectedVoxel(null); // Clear voxel selection when loading new project
        setSelectedVoxels(new Set()); // Clear multiple voxel selections
        const coordinates = await fetchVoxels(projectToLoad, partitionToLoad);
        if (coordinates.length > 0) {
          setVoxelCoordinates(coordinates);
          setProjectFetchStatus('idle');
        } else {
          setProjectFetchStatus('error');
        }
      } catch {
        setProjectFetchStatus('error');
      }
    },
    [projectName, selectedPartition, fetchVoxels],
  );

  // Refresh model after adding/removing voxels in layer editor
  const handleRefreshVoxels = useCallback(async () => {
    if (!projectName.trim() || !selectedPartition) return;
    try {
      const coordinates = await fetchVoxelized(projectName, selectedPartition);
      setVoxelCoordinates(coordinates);
      setProjectFetchStatus('idle');
    } catch {
      setProjectFetchStatus('error');
    }
  }, [projectName, selectedPartition]);

  const handleDownloadCSV = useCallback(async () => {
    if (!projectName.trim()) {
      alert('Please select a project to download.');
      return;
    }

    try {
      const blob = await downloadVoxelCSV(projectName, projectName); // eventually change so that user can input export name?
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download CSV', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to download CSV. Please try again.',
      );
    }
  }, [projectName]);

  // Menu handlers
  const handleOpenFile = useCallback(() => {
    const uploadInput = document.getElementById('stl-upload-input');
    if (uploadInput) {
      uploadInput.click();
    }
  }, []);

  const handleUploadFile = useCallback(
    async (file: File): Promise<boolean> => {
      if (!file.name.toLowerCase().endsWith('.stl')) {
        alert('Please select a file with the .stl extension.');
        return false;
      }

      try {
        await uploadSTLFile(file);
        await fetchModels(); // Refresh the model list
        // Use the uploaded file's name directly - list order is unreliable (filesystem order)
        const uploadedModelName = file.name.toLowerCase().endsWith('.stl')
          ? file.name
          : `${file.name}.stl`;
        setSelectedModel(uploadedModelName);
        return true;
      } catch (error) {
        console.error('Failed to upload STL file', error);
        alert(
          error instanceof Error
            ? error.message
            : 'Failed to upload STL file. Please try again.',
        );
        return false;
      }
    },
    [fetchModels],
  );

  const handleWelcomeFileSelected = useCallback(
    async (file: File) => {
      const success = await handleUploadFile(file);
      if (success) {
        dismissWelcomeModal();
        setIsNewProjectDialogOpen(true);
      }
    },
    [handleUploadFile, dismissWelcomeModal],
  );

  const handleWelcomeCreateNewProject = useCallback(() => {
    dismissWelcomeModal();
    setIsNewProjectDialogOpen(true);
  }, [dismissWelcomeModal]);

  const handleUploadFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleNewProjectConfirm = useCallback(
    async (
      payload: {
        projectName: string;
        modelUnits: 'µm' | 'mm' | 'cm';
        scaleFactor: number;
        voxelSize: number;
        defaultMaterial: string;
      },
      onProgress?: (message: string) => void,
    ) => {
      if (!selectedModel) {
        return;
      }

      const {
        projectName,
        modelUnits,
        scaleFactor,
        voxelSize,
        defaultMaterial,
      } = payload;

      try {
        onProgress?.('Voxelizing model...');
        const res = await voxelizeModel({
          stlFilename: selectedModel,
          projectName,
          modelUnits,
          scaleFactor,
          voxelSize,
          defaultMaterial,
        });
        setVoxelSize(res.voxel_size);

        onProgress?.('Breaking into partitions...');
        const projectList = await fetchAvailableProjects();
        setAvailableProjects(projectList);

        const projectFolderName =
          res.project_folder_name ?? `${projectName}-dir`;
        setProjectName(projectFolderName);
        const parts = await fetchPartitions(projectFolderName);

        onProgress?.('Loading project...');
        await clearHistory();
        if (parts.length > 0) {
          setSelectedPartition(parts[0]);
          handleLoadVoxels(projectFolderName, parts[0]);
        } else {
          setSelectedPartition(null);
        }
        dismissWelcomeModal();
      } catch (error) {
        console.error('Failed to create project', error);
        alert(
          error instanceof Error
            ? error.message
            : 'Failed to create project. Please try again.',
        );
        throw error;
      }
    },
    [selectedModel, handleLoadVoxels, dismissWelcomeModal],
  );

  const handleOpenProjectSelect = useCallback(
    (selectedProjectName: string) => {
      setProjectName(selectedProjectName);
      setSelectedPartition(null);
      dismissWelcomeModal();
      clearHistory().catch(console.error);
      fetchPartitions(selectedProjectName).then((parts) => {
        if (parts.length > 0) {
          const first = parts[0];
          setSelectedPartition(first);
          handleLoadVoxels(selectedProjectName, first);
        }
      });
    },
    [handleLoadVoxels, dismissWelcomeModal],
  );

  const handlePartitionSelect = useCallback(
    (partitionName: string) => {
      setSelectedPartition(partitionName);
      clearHistory().catch(console.error);
      if (projectName) {
        handleLoadVoxels(projectName, partitionName);
      }
    },
    [projectName, handleLoadVoxels],
  );

  const handleSave = useCallback(async () => {
    if (projectName.trim()) {
      await handleDownloadCSV();
    } else {
      alert('No project to save. Please create or load a project first.');
    }
  }, [projectName, handleDownloadCSV]);

  const handleExport = useCallback(async () => {
    if (!projectName.trim()) {
      alert('Please select a project to export.');
      return;
    }
    await handleDownloadCSV();
  }, [projectName, handleDownloadCSV]);

  const handleSaveAs = useCallback(async () => {
    const newName = prompt(
      'Enter new project name:',
      projectName || 'new-project',
    );
    if (newName && newName.trim()) {
      try {
        const projectToSave = projectName || newName;
        const blob = await downloadVoxelCSV(projectName, projectToSave);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${newName}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert(`Project saved as ${newName}.csv`);
      } catch (error) {
        alert(`Failed to save project. Please try again. ${error}`);
      }
    }
  }, [projectName]);

  // Edit menu handlers (disabled as per previous requirements)
  const handleUndo = useCallback(async () => {
    console.log('Undo action triggered');
    console.log('Current project name:', projectName);
    if (!projectName.trim()) {
      alert('Please select a project to undo changes.');
      return;
    }
    if (!selectedPartition) {
      alert('Please select a partition to undo changes.');
      return;
    }

    try {
      await updateHistory({
        project_name: projectName,
        partition_name: selectedPartition,
        action: 'undo',
      });
      await handleRefreshVoxels();
    } catch (error) {
      console.error('Failed to undo changes', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to undo changes. Please try again.',
      );
    }
  }, [projectName, selectedPartition, handleRefreshVoxels]);
  const handleRedo = useCallback(async () => {
    console.log('Redo action triggered');
    console.log('Current project name:', projectName);
    if (!projectName.trim()) {
      alert('Please select a project to redo changes.');
      return;
    }
    if (!selectedPartition) {
      alert('Please select a partition to redo changes.');
      return;
    }

    try {
      await updateHistory({
        project_name: projectName,
        partition_name: selectedPartition,
        action: 'redo',
      });
      await handleRefreshVoxels();
    } catch (error) {
      console.error('Failed to redo changes', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to redo changes. Please try again.',
      );
    }
  }, [projectName, selectedPartition, handleRefreshVoxels]);
  const handleCopy = useCallback(() => {
    if (isLayerEditorOpen) {
      const props = modelViewerRef.current?.getSelectionProperties() ?? null;
      if (props) setCopiedVoxelProperties(props);
    }
  }, [isLayerEditorOpen]);
  const handleCut = useCallback(() => {
    if (isLayerEditorOpen) {
      const props = modelViewerRef.current?.getSelectionProperties() ?? null;
      if (props) {
        setCopiedVoxelProperties(props);
        setSelectedVoxels(new Set());
        setSelectedVoxel(null);
      }
    }
  }, [isLayerEditorOpen]);
  const handlePaste = useCallback(async () => {
    if (isLayerEditorOpen && copiedVoxelProperties) {
      await modelViewerRef.current?.applyPaste(copiedVoxelProperties);
    }
  }, [isLayerEditorOpen, copiedVoxelProperties]);

  const handlePreferences = useCallback(() => {
    alert(
      'Preferences dialog would open here.\nOptions: colors of interface, etc.',
    );
  }, []);

  const handleOpenPartitionMenu = useCallback(() => {
    setIsPartitionsPanelOpen(true);
  }, []);

  const handleOpenLayerMenu = useCallback(() => {
    if (projectName.trim()) {
      setIsLayerEditingMode(true);
      setIsLayerEditorOpen(true);
    } else {
      alert('Please select a project to open the Layer Editor.');
    }
  }, [projectName]);

  const handleHighlightAll = useCallback(() => {
    if (voxelCoordinates.length > 0) {
      setSelectedVoxels(new Set(voxelCoordinates.map((_, i) => i)));
    }
  }, [voxelCoordinates]);

  const handleSelectAll = useCallback(() => {
    if (isLayerEditorOpen) {
      modelViewerRef.current?.selectAllInLayer();
    } else {
      handleHighlightAll();
    }
  }, [handleHighlightAll, isLayerEditorOpen]);

  const handleResetSelected = useCallback(() => {
    setSelectedVoxels(new Set());
    setSelectedVoxel(null);
  }, []);

  const handleViewManual = useCallback(() => {
    window.open('/docs', '_blank');
  }, []);

  const handleLicense = useCallback(() => {
    alert('License information would be displayed here.');
  }, []);

  const handlePrivacy = useCallback(() => {
    alert('Privacy statement would be displayed here.');
  }, []);

  const handleAbout = useCallback(() => {
    alert('Voxel Editor v1.0\nA 3D voxel editing application.');
  }, []);

  const handleCredits = useCallback(() => {
    alert('Credits:\nDeveloped by Five-of-a-Kind team.');
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'e':
            e.preventDefault();
            handleExport();
            break;
          case 'a':
            e.preventDefault();
            handleSelectAll();
            break;
          case 'c':
            e.preventDefault();
            handleCopy();
            break;
          case 'v':
            e.preventDefault();
            handlePaste();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
          case 'p':
            e.preventDefault();
            if (!isLayerEditorOpen) {
              handleOpenPartitionMenu();
            }
            break;
          case 'l':
            e.preventDefault();
            if (!isPartitionsPanelOpen) {
              handleOpenLayerMenu();
            }
            break;
          case 'x':
            e.preventDefault();
            handleCut();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleSave,
    handleExport,
    handleSelectAll,
    handleCopy,
    handlePaste,
    handleUndo,
    handleRedo,
    handleCut,
    handleOpenPartitionMenu,
    handleOpenLayerMenu,
    isLayerEditorOpen,
    isPartitionsPanelOpen,
  ]);

  return (
    <div className="app">
      <MenuBar
        onOpenFile={handleOpenFile}
        onOpenFileSelect={handleModelChange}
        availableModels={models}
        onUploadFile={handleWelcomeImportSTL}
        onNewProject={handleWelcomeNewProject}
        onOpenProject={handleWelcomeExistingProject}
        onOpenProjectSelect={handleOpenProjectSelect}
        availableProjects={(() => {
          const stlBase = selectedModel
            ? selectedModel.replace(/\.stl$/i, '')
            : projectName.trim()
              ? projectName.replace(/-dir$/i, '').split('-')[0]
              : null;
          if (!stlBase) return availableProjects;
          return availableProjects.filter((project) =>
            project.toLowerCase().includes(stlBase.toLowerCase()),
          );
        })()}
        selectedModel={selectedModel}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExport={handleExport}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={true}
        canRedo={true}
        onCut={handleCut}
        canCut={isLayerEditorOpen}
        onCopy={handleCopy}
        onPaste={handlePaste}
        canPaste={isLayerEditorOpen && !!copiedVoxelProperties}
        canCopy={isLayerEditorOpen}
        onPreferences={handlePreferences}
        onOpenPartitionMenu={handleOpenPartitionMenu}
        onOpenLayerMenu={handleOpenLayerMenu}
        onHighlightAll={handleHighlightAll}
        onSelectAll={handleSelectAll}
        onResetSelected={handleResetSelected}
        onViewManual={handleViewManual}
        onLicense={handleLicense}
        onPrivacy={handlePrivacy}
        onAbout={handleAbout}
        onCredits={handleCredits}
      />
      <input
        ref={fileInputRef}
        id="stl-upload-input"
        type="file"
        accept=".stl"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            await handleWelcomeFileSelected(file);
          }
          e.target.value = '';
        }}
      />
      <WelcomeModal
        isOpen={showWelcomeModal}
        initialStep={welcomeInitialStep}
        onClose={dismissWelcomeModal}
        availableModels={models}
        availableProjects={availableProjects}
        onSelectModel={setSelectedModel}
        onSelectProject={handleOpenProjectSelect}
        onCreateNewProject={handleWelcomeCreateNewProject}
        onFileSelected={handleWelcomeFileSelected}
      />
      <NewProjectDialog
        isOpen={isNewProjectDialogOpen}
        stlFileName={selectedModel || ''}
        onClose={() => setIsNewProjectDialogOpen(false)}
        onConfirm={handleNewProjectConfirm}
      />
      <PartitionsPanel
        isOpen={isPartitionsPanelOpen}
        onClose={() => setIsPartitionsPanelOpen(false)}
        projectName={projectName || null}
        selectedPartition={selectedPartition}
        onPartitionSelect={handlePartitionSelect}
      />
      <ModelViewer
        ref={modelViewerRef}
        selectedModel={selectedModel}
        voxelCoordinates={voxelCoordinates}
        projectFetchStatus={projectFetchStatus}
        onStatusChange={handleStatusChange}
        selectedLayerZ={isLayerEditingMode ? selectedLayerZ : null}
        layerAxis={layerAxis}
        projectName={projectName}
        selectedPartition={selectedPartition}
        onPartitionSelect={handlePartitionSelect}
        voxelSize={voxelSize}
        isLayerEditorOpen={isLayerEditorOpen}
        onLayerEditorOpenChange={setIsLayerEditorOpen}
        onVoxelsChanged={handleRefreshVoxels}
        onLayerSelect={(layerZ) => {
          setSelectedLayerZ(layerZ);
          if (layerZ !== null) {
            setIsLayerEditingMode(true);
          }
        }}
        onVoxelSelect={setSelectedVoxel}
        onVoxelsSelect={(newSet) => {
          setSelectedVoxels(new Set(newSet));
        }}
        selectedVoxelIndex={selectedVoxel?.index ?? null}
        selectedVoxelIndices={selectedVoxels}
        selectedVoxelIndicesArray={selectedVoxelIndicesArray}
        isLayerEditingMode={isLayerEditingMode}
      />
    </div>
  );
}

export default App;
