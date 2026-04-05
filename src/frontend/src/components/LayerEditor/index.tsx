// This component is used to edit the voxels in a layer

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { LayerResponse, VoxelPropertiesClipboard } from '../../utils/api';
import { Layer2DGrid } from '../Layer2DGrid';
import { useLayerData } from './hooks/useLayerData';
import { useVoxelEditor } from './hooks/useVoxelEditor';
import { VoxelPropertiesPanel } from './VoxelPropertiesPanel';
import { useLayerMaterials } from './useLayerMaterials';

// Props for the LayerEditor component
export interface LayerEditorHandle {
  getSelectionProperties: () => VoxelPropertiesClipboard | null;
  applyPaste: (props: VoxelPropertiesClipboard) => Promise<void>;
  selectAllInLayer: () => void;
}

// Props for the LayerEditor component
interface LayerEditorProps {
  projectName: string;
  partitionName: string | null;
  voxelSize?: number;
  layerAxis?: 'z' | 'x' | 'y';
  onLayerSelect?: (layerZ: number | null) => void;
  selectedLayerZ?: number | null;
  disabled?: boolean;
  isOpen: boolean;
  onClose: () => void;
  /** Called after voxels are added or removed so the model viewer can refresh. */
  onVoxelsChanged?: () => void | Promise<void>;
}

export const LayerEditor = forwardRef<LayerEditorHandle, LayerEditorProps>(
  function LayerEditor(
    {
      projectName,
      partitionName,
      voxelSize,
      layerAxis = 'y',
      onLayerSelect,
      selectedLayerZ: externalSelectedLayerZ,
      disabled = false,
      isOpen,
      onClose,
      onVoxelsChanged,
    },
    ref,
  ) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedLayerData, setSelectedLayerData] =
      useState<LayerResponse | null>(null);
    const [editVoxelsMode, setEditVoxelsMode] = useState(false);
    const loadLayerRef = useRef<(z: number) => Promise<void>>(async () => {});
    const stableLoadLayer = useCallback(
      (z: number) => loadLayerRef.current(z),
      [],
    );

    const {
      materials,
      setMaterialColor,
      addMaterial,
      ensureMaterialIdsForVoxels,
    } = useLayerMaterials(projectName);

    useEffect(() => {
      if (!selectedLayerData?.voxels?.length) return;
      const ids = new Set<number>();
      for (const v of selectedLayerData.voxels) {
        if (v.material != null && v.material >= 1) ids.add(v.material);
      }
      ensureMaterialIdsForVoxels(ids);
    }, [selectedLayerData, ensureMaterialIdsForVoxels]);

    // Voxel editor hooks
    const {
      selectedVoxelIndices,
      selectedMaterial,
      setSelectedMaterial,
      setSelectedTheta,
      setSelectedPhi,
      displayTheta,
      setDisplayTheta,
      displayPhi,
      setDisplayPhi,
      hasChanges,
      setHasChanges,
      message,
      clearSelection,
      handleVoxelSelect,
      handleVoxelsSelect,
      selectAllInLayer,
      handleConfirmMaterial,
      handleConfirmMagnetization,
      handleVoxelAdd,
      handleVoxelRemove,
      handleVoxelsAdd,
      handleVoxelsRemove,
      getSelectionProperties,
      applyPaste,
    } = useVoxelEditor({
      projectName,
      partitionName,
      layerAxis,
      voxelSize,
      externalSelectedLayerZ,
      selectedLayerData,
      setSelectedLayerData,
      setLoading,
      setError,
      loadLayer: stableLoadLayer,
      onVoxelsChanged,
    });

    // Layer data hooks
    const { layersData, loadLayers, loadLayer } = useLayerData({
      projectName,
      partitionName,
      layerAxis,
      disabled,
      isOpen,
      externalSelectedLayerZ,
      onLayerSelect,
      onLayerChanged: clearSelection,
      setLoading,
      setError,
      setSelectedLayerData,
    });

    // Keep the loadLayer ref in sync with the real loadLayer each render
    loadLayerRef.current = loadLayer;

    // Handles the refresh of the layer data
    const handleRefresh = useCallback(() => {
      if (
        externalSelectedLayerZ !== undefined &&
        externalSelectedLayerZ !== null
      ) {
        loadLayer(externalSelectedLayerZ);
      }
      loadLayers();
    }, [externalSelectedLayerZ, loadLayer, loadLayers]);

    // Handles the confirmation of the material
    const handleConfirm = useCallback(async () => {
      await handleConfirmMaterial();
    }, [handleConfirmMaterial]);

    // Imperative handle for the LayerEditor component, this is used to interact with the LayerEditor component from outside
    useImperativeHandle(
      ref,
      () => ({ getSelectionProperties, applyPaste, selectAllInLayer }),
      [getSelectionProperties, applyPaste, selectAllInLayer],
    );

    // If the component is not open, return null
    if (!isOpen) return null;

    // If the project name is not set or the component is disabled, return a placeholder
    if (!projectName.trim() || disabled) {
      return (
        <div className="layer-editor-panel open">
          <div className="layer-editor-header">
            <h3>Layer Editor</h3>
            <button onClick={onClose} className="close-button" title="Close">
              ×
            </button>
          </div>
          <p className="empty-message">Select a project to view layers</p>
        </div>
      );
    }

    const selectedIndicesArray = Array.from(selectedVoxelIndices);
    const selectedVoxel =
      selectedIndicesArray.length === 1 && selectedLayerData
        ? selectedLayerData.voxels[selectedIndicesArray[0]]
        : null;

    const layers = layersData?.layers ?? [];
    const currentIdx =
      selectedLayerData != null
        ? layers.findIndex((l) => l.index === selectedLayerData.layer_index)
        : -1;
    // layers is sorted ascending by index, so a higher array position = higher layer index. "Up" moves toward the end of the array; "Down" toward the start.
    const canGoUp = currentIdx >= 0 && currentIdx < layers.length - 1;
    const canGoDown = currentIdx > 0;

    return (
      <div className="layer-editor-panel open">
        <div className="layer-editor-header">
          <h3>Layer Editor</h3>
          <div className="header-actions">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="refresh-button"
            >
              Refresh
            </button>
            <button onClick={onClose} className="close-button" title="Close">
              ×
            </button>
          </div>
        </div>

        <div className="layer-editor-content">
          {loading && !layersData && (
            <p className="loading-message">Loading layers...</p>
          )}
          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message">{message}</p>}

          {/* 2D View Section */}
          <div className="layer-2d-grid-section">
            <div className="layer-2d-grid-section-header">
              <h5>2D View</h5>
              <button
                type="button"
                className={`layer-edit-voxels-btn ${editVoxelsMode ? 'active' : ''}`}
                onClick={() => setEditVoxelsMode((v) => !v)}
                title="Left-click to remove voxel, right-click on empty cell to add"
              >
                {editVoxelsMode ? 'Exit Add/Remove' : 'Add/Remove voxels'}
              </button>
            </div>
            <Layer2DGrid
              layerData={selectedLayerData}
              width={500}
              height={400}
              materialColors={Object.fromEntries(
                materials.map((m) => [m.id, m.color]),
              )}
              onVoxelSelect={handleVoxelSelect}
              onVoxelsSelect={handleVoxelsSelect}
              selectedVoxelIndices={selectedVoxelIndices}
              editVoxelsMode={editVoxelsMode}
              onVoxelAdd={editVoxelsMode ? handleVoxelAdd : undefined}
              onVoxelRemove={editVoxelsMode ? handleVoxelRemove : undefined}
              onVoxelsAdd={editVoxelsMode ? handleVoxelsAdd : undefined}
              onVoxelsRemove={editVoxelsMode ? handleVoxelsRemove : undefined}
              onLayerUp={() => {
                if (canGoUp) loadLayer(layers[currentIdx + 1].coordinate);
              }}
              onLayerDown={() => {
                if (canGoDown) loadLayer(layers[currentIdx - 1].coordinate);
              }}
              canGoUp={canGoUp}
              canGoDown={canGoDown}
            />
            <div className="layer-header-block">
              {selectedLayerData && (
                <p className="layer-2d-info">
                  Layer {layerAxis.toUpperCase()}=
                  {selectedLayerData.layer_index} (
                  {selectedLayerData.num_voxels} voxels)
                </p>
              )}
              <div className="layer-toggle-row">
                <p className="layer-toggle-label">
                  Magnetized voxels denoted by
                </p>
                <span className="checkmark-circle">×</span>
              </div>
            </div>
          </div>

          <VoxelPropertiesPanel
            materials={materials}
            onMaterialColorChange={setMaterialColor}
            onAddMaterialId={addMaterial}
            selectedVoxelIndices={selectedVoxelIndices}
            selectedVoxel={selectedVoxel ?? null}
            selectedVoxelIndex={
              selectedIndicesArray.length === 1 ? selectedIndicesArray[0] : null
            }
            selectedMaterial={selectedMaterial}
            displayTheta={displayTheta}
            displayPhi={displayPhi}
            hasChanges={hasChanges}
            loading={loading}
            onMaterialChange={(id) => {
              setSelectedMaterial(id);
              setHasChanges(true);
            }}
            onThetaChange={(val) => {
              setDisplayTheta(val);
              const v = parseFloat(val);
              if (!Number.isNaN(v)) setSelectedTheta(v);
              setHasChanges(true);
            }}
            onPhiChange={(val) => {
              setDisplayPhi(val);
              const v = parseFloat(val);
              if (!Number.isNaN(v)) setSelectedPhi(v);
              setHasChanges(true);
            }}
            onConfirmMaterial={handleConfirm}
            onConfirmMagnetization={handleConfirmMagnetization}
          />
        </div>
      </div>
    );
  },
);
