import { useCallback, useEffect, useState, useRef } from 'react';
import './App.css';
import { ModelViewer } from './components/ModelViewer';
import { MenuBar } from './components/MenuBar';
import { NewProjectDialog } from './components/NewProjectDialog';
import {
  fetchAvailableModels,
  fetchAvailableProjects,
  fetchVoxelized,
  uploadSTLFile,
  voxelizeModel,
  downloadVoxelCSV,
  updateHistory,
  type VoxelPropertiesClipboard,
} from './utils/api';
import type { LayerEditorHandle } from './components/LayerEditor';

function App() {
  const [, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [selectedPartition, setSelectedPartition] = useState<string | null>(null);
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [voxelCoordinates, setVoxelCoordinates] = useState<number[][]>([]);
  const [voxelSize] = useState<string>('0.1');
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
  const [layerAxis] = useState<'z' | 'x' | 'y'>('z');
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
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

  const fetchVoxels = useCallback(async (project: string, partition: string) => {
    try {
      const coordinates = await fetchVoxelized(project, partition);
      setVoxelCoordinates(coordinates);
      return coordinates;
    } catch (error) {
      console.error('Failed to fetch voxelized coordinates', error);
      setVoxelCoordinates([]);
      throw error;
    }
  }, []);

  useEffect(() => {
    const initialiseModels = async () => {
      setStatus('loading');

      try {
        const modelList = await fetchModels();
        if (modelList.length > 0) {
          setSelectedModel((current) =>
            current && modelList.includes(current) ? current : modelList[0],
          );
        } else {
          setSelectedModel(null);
          setStatus('error');
        }
      } catch {
        setSelectedModel(null);
        setStatus('error');
      }
    };

    void initialiseModels();
    void fetchProjects();
  }, [fetchModels, fetchProjects]);

  const handleStatusChange = useCallback(
    (newStatus: 'loading' | 'ready' | 'error') => {
      setStatus(newStatus);
    },
    [],
  );

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
        setStatus('loading');
        setSelectedModel(null); // Clear STL model when loading project - show voxels only
        setSelectedLayerZ(null); // Clear layer selection when loading new project
        setSelectedVoxel(null); // Clear voxel selection when loading new project
        setSelectedVoxels(new Set()); // Clear multiple voxel selections
        const coordinates = await fetchVoxels(projectToLoad, partitionToLoad);
        if (coordinates.length > 0) {
          setVoxelCoordinates(coordinates);
          setStatus('ready');
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    },
    [projectName, selectedPartition, fetchVoxels],
  );

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
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.stl')) {
        alert('Please select a file with the .stl extension.');
        return;
      }

      try {
        await uploadSTLFile(file);
        const modelList = await fetchModels();
        const nextModel = modelList.at(-1) ?? null;
        if (nextModel) {
          setSelectedModel(nextModel);
        }
      } catch (error) {
        console.error('Failed to upload STL file', error);
        alert(
          error instanceof Error
            ? error.message
            : 'Failed to upload STL file. Please try again.',
        );
      }
    },
    [fetchModels],
  );

  const handleUploadFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleNewProject = useCallback(() => {
    if (!selectedModel) {
      alert('Please select an STL model first.');
      return;
    }
    setIsNewProjectDialogOpen(true);
  }, [selectedModel]);

  const handleNewProjectConfirm = useCallback(
    async (projectName: string) => {
      if (!selectedModel) {
        return;
      }

      try {
        // Make POST call to create/voxelize the project
        const defaultVoxelSize = parseFloat(voxelSize) || 0.1;
        await voxelizeModel(selectedModel, defaultVoxelSize, projectName);

        // Refresh project list
        const projectList = await fetchAvailableProjects();
        setAvailableProjects(projectList);

        // Set the new project as current and load voxels
        setProjectName(projectName);
        handleLoadVoxels(projectName);
      } catch (error) {
        console.error('Failed to create project', error);
        alert(
          error instanceof Error
            ? error.message
            : 'Failed to create project. Please try again.',
        );
      }
    },
    [selectedModel, voxelSize, handleLoadVoxels],
  );

  const handleOpenProjectSelect = useCallback(
    (selectedProjectName: string) => {
      setProjectName(selectedProjectName);
      setSelectedPartition(null); // Clear partition selection when project changes
      // Don't load voxels until a partition is selected
    },
    [],
  );

  const handlePartitionSelect = useCallback(
    (partitionName: string) => {
      setSelectedPartition(partitionName);
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
      const updatedCoordinates = await updateHistory({
        project_name: projectName,
        partition_name: selectedPartition,
        action: 'undo',
      });
      console.log('Undo successful, updated coordinates:', updatedCoordinates);
    } catch (error) {
      console.error('Failed to undo changes', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to undo changes. Please try again.',
      );
    }
  }, [projectName, selectedPartition]);
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
      const updatedCoordinates = await updateHistory({
        project_name: projectName,
        partition_name: selectedPartition,
        action: 'redo',
      });
      console.log('Redo successful, updated coordinates:', updatedCoordinates);
    } catch (error) {
      console.error('Failed to redo changes', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to redo changes. Please try again.',
      );
    }
  }, [projectName, selectedPartition]);
  const handleCopy = useCallback(() => {
    if (isLayerEditorOpen) {
      const props = modelViewerRef.current?.getSelectionProperties() ?? null;
      if (props) setCopiedVoxelProperties(props);
    }
  }, [isLayerEditorOpen]);
  const handleCut = useCallback(() => {
    /* no-op */
  }, []);
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
    alert('Partition Menu functionality not yet implemented.');
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
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleExport, handleSelectAll, handleCopy, handlePaste]);

  return (
    <div className="app">
      <MenuBar
        onOpenFile={handleOpenFile}
        onOpenFileSelect={handleModelChange}
        availableModels={models}
        onUploadFile={handleUploadFileClick}
        onNewProject={handleNewProject}
        onOpenProjectSelect={handleOpenProjectSelect}
        availableProjects={
          selectedModel
            ? availableProjects.filter((project) =>
                project
                  .toLowerCase()
                  .includes(selectedModel.replace('.stl', '').toLowerCase()),
              )
            : availableProjects
        }
        selectedModel={selectedModel}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExport={handleExport}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={true}
        canRedo={true}
        onCut={handleCut}
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
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleUploadFile(file);
          }
          e.target.value = '';
        }}
      />
      <NewProjectDialog
        isOpen={isNewProjectDialogOpen}
        stlFileName={selectedModel || ''}
        onClose={() => setIsNewProjectDialogOpen(false)}
        onConfirm={handleNewProjectConfirm}
      />
      <ModelViewer
        ref={modelViewerRef}
        selectedModel={selectedModel}
        voxelCoordinates={voxelCoordinates}
        onStatusChange={handleStatusChange}
        selectedLayerZ={isLayerEditingMode ? selectedLayerZ : null}
        layerAxis={layerAxis}
        projectName={projectName}
        selectedPartition={selectedPartition}
        onPartitionSelect={handlePartitionSelect}
        voxelSize={parseFloat(voxelSize) || 0.1}
        isLayerEditorOpen={isLayerEditorOpen}
        onLayerEditorOpenChange={setIsLayerEditorOpen}
        onLayerSelect={(layerZ) => {
          setSelectedLayerZ(layerZ);
          if (layerZ !== null) {
            setIsLayerEditingMode(true);
          }
        }}
        onVoxelSelect={setSelectedVoxel}
        onVoxelsSelect={(newSet) => {
          // Force a new Set reference to ensure React detects the change
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
