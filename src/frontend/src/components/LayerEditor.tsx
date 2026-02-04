import { useCallback, useEffect, useState } from 'react';
import {
  fetchLayers,
  fetchLayer,
  updateVoxels,
  type LayersResponse,
  type LayerResponse,
  type LayerVoxel,
} from '../utils/api';
import { Layer2DGrid } from '../components/Layer2DGrid';

interface LayerEditorProps {
  projectName: string;
  voxelSize?: number;
  layerAxis?: 'z' | 'x' | 'y';
  onLayerSelect?: (layerZ: number | null) => void;
  selectedLayerZ?: number | null;
  disabled?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

// Material options with colors
const MATERIALS = [
  { id: 1, name: 'Material 1', color: '#ef4444' }, // Red
  { id: 2, name: 'Material 2', color: '#f97316' }, // Orange
  { id: 3, name: 'Material 3', color: '#eab308' }, // Yellow
  { id: 4, name: 'Material 4', color: '#22c55e' }, // Green
  { id: 5, name: 'Material 5', color: '#3b82f6' }, // Blue
  { id: 6, name: 'Material 6', color: '#8b5cf6' }, // Purple
];

// Angle presets for each axis
const ANGLE_PRESETS = {
  x: [0, 45, 90, 135, 180, 270],
  y: [0, 45, 90, 135, 180, 270],
  z: [0, 45, 90, 135, 180, 270],
  favourite: [0, 30, 45, 60, 90, 180],
};

export const LayerEditor = ({
  projectName,
  voxelSize,
  layerAxis = 'z',
  onLayerSelect,
  selectedLayerZ: externalSelectedLayerZ,
  disabled = false,
  isOpen,
  onClose,
}: LayerEditorProps) => {
  const [layersData, setLayersData] = useState<LayersResponse | null>(null);
  const [selectedLayerData, setSelectedLayerData] =
    useState<LayerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [selectedVoxelIndex, setSelectedVoxelIndex] = useState<number | null>(
    null,
  );
  const [selectedMaterial, setSelectedMaterial] = useState<number>(1);
  const [selectedAngleX, setSelectedAngleX] = useState<number>(0);
  const [selectedAngleY, setSelectedAngleY] = useState<number>(0);
  const [selectedAngleZ, setSelectedAngleZ] = useState<number>(0);
  const [hasChanges, setHasChanges] = useState(false);

  const loadLayers = useCallback(async () => {
    if (!projectName.trim() || disabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLayers(projectName, voxelSize, layerAxis);
      setLayersData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load layers');
      setLayersData(null);
    } finally {
      setLoading(false);
    }
  }, [projectName, voxelSize, layerAxis, disabled]);

  const loadLayer = useCallback(
    async (layerZ: number) => {
      console.log(`[LayerEditor] loadLayer called with layerZ: ${layerZ}`);
      if (!projectName.trim() || disabled) {
        console.log(
          `[LayerEditor] loadLayer skipped - projectName empty or disabled`,
        );
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchLayer(
          projectName,
          layerZ,
          voxelSize,
          layerAxis,
        );
        console.log(
          `[LayerEditor] fetchLayer returned layer_index: ${data.layer_index}`,
        );
        setSelectedLayerData(data);
        onLayerSelect?.(layerZ);
      } catch (err) {
        console.error(`[LayerEditor] fetchLayer error:`, err);
        setError(err instanceof Error ? err.message : 'Failed to load layer');
        setSelectedLayerData(null);
      } finally {
        setLoading(false);
      }
    },
    [projectName, voxelSize, layerAxis, disabled, onLayerSelect],
  );

  // When a voxel is selected from the 2D grid
  const handleVoxelSelect = useCallback(
    (voxel: LayerVoxel | null, index: number) => {
      if (voxel && index >= 0) {
        setSelectedVoxelIndex(index);
        setSelectedMaterial(voxel.material || 1);
        setSelectedAngleX(0);
        setSelectedAngleY(0);
        setSelectedAngleZ(voxel.angle || 0);
        setHasChanges(false);
      } else {
        setSelectedVoxelIndex(null);
      }
    },
    [],
  );

  // Apply changes to the selected voxel - update material
  const handleConfirmMaterial = useCallback(async () => {
    if (selectedVoxelIndex === null || !selectedLayerData) return;

    const selectedVoxel = selectedLayerData.voxels[selectedVoxelIndex];
    if (!selectedVoxel) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Use grid coordinates (ix, iy, iz) for the update
      const voxelCoords: [number, number, number][] = [
        [selectedVoxel.ix, selectedVoxel.iy, selectedVoxel.iz],
      ];

      await updateVoxels({
        project_name: projectName,
        voxels: voxelCoords,
        action: 'update',
        materialID: selectedMaterial,
      });

      // Update local state
      const updatedVoxels = [...selectedLayerData.voxels];
      updatedVoxels[selectedVoxelIndex] = {
        ...updatedVoxels[selectedVoxelIndex],
        material: selectedMaterial,
      };

      setMessage('Material updated successfully!');
      setSelectedLayerData({ ...selectedLayerData, voxels: updatedVoxels });
      setHasChanges(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update material',
      );
    } finally {
      setLoading(false);
    }
  }, [selectedVoxelIndex, selectedLayerData, selectedMaterial, projectName]);

  // Apply changes to the selected voxel - update magnetization/angle
  const handleConfirmMagnetization = useCallback(async () => {
    if (selectedVoxelIndex === null || !selectedLayerData) return;

    const selectedVoxel = selectedLayerData.voxels[selectedVoxelIndex];
    if (!selectedVoxel) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Use grid coordinates (ix, iy, iz) for the update
      const voxelCoords: [number, number, number][] = [
        [selectedVoxel.ix, selectedVoxel.iy, selectedVoxel.iz],
      ];

      // Convert angles to magnetization vector (simplified - using Z angle for now)
      // In a full implementation, you'd compute from X, Y, Z angles
      const magnetization: [number, number, number] = [
        selectedAngleX,
        selectedAngleY,
        selectedAngleZ,
      ];

      await updateVoxels({
        project_name: projectName,
        voxels: voxelCoords,
        action: 'update',
        magnetization: magnetization,
      });

      // Update local state
      const updatedVoxels = [...selectedLayerData.voxels];
      updatedVoxels[selectedVoxelIndex] = {
        ...updatedVoxels[selectedVoxelIndex],
        angle: selectedAngleZ,
      };

      setMessage('Magnetization updated successfully!');
      setSelectedLayerData({ ...selectedLayerData, voxels: updatedVoxels });
      setHasChanges(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update magnetization',
      );
    } finally {
      setLoading(false);
    }
  }, [
    selectedVoxelIndex,
    selectedLayerData,
    selectedAngleX,
    selectedAngleY,
    selectedAngleZ,
    projectName,
  ]);

  // Combined confirm that updates material (backend only supports one at a time)
  const handleConfirm = useCallback(async () => {
    // For now, just update material since backend requires separate calls
    await handleConfirmMaterial();
  }, [handleConfirmMaterial]);

  useEffect(() => {
    console.log(
      `[LayerEditor] useEffect triggered - externalSelectedLayerZ: ${externalSelectedLayerZ}`,
    );
    if (
      externalSelectedLayerZ !== undefined &&
      externalSelectedLayerZ !== null &&
      projectName.trim() &&
      !disabled
    ) {
      loadLayer(externalSelectedLayerZ);
    } else if (externalSelectedLayerZ === null) {
      console.log(
        `[LayerEditor] Clearing layer data (externalSelectedLayerZ is null)`,
      );
      setSelectedLayerData(null);
    }
  }, [externalSelectedLayerZ, projectName, disabled, loadLayer]);

  useEffect(() => {
    if (projectName.trim() && !disabled) {
      loadLayers();
    } else {
      setLayersData(null);
      setSelectedLayerData(null);
    }
  }, [projectName, disabled, layerAxis, loadLayers]);

  if (!isOpen) return null;

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

  const selectedVoxel =
    selectedVoxelIndex !== null && selectedLayerData
      ? selectedLayerData.voxels[selectedVoxelIndex]
      : null;

  return (
    <div className="layer-editor-panel open">
      <div className="layer-editor-header">
        <h3>Layer Editor</h3>
        <div className="header-actions">
          <button
            onClick={loadLayers}
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
          <h5>2D View</h5>
          <Layer2DGrid
            layerData={selectedLayerData}
            width={500}
            height={400}
            onVoxelSelect={handleVoxelSelect}
            selectedVoxelIndex={selectedVoxelIndex}
          />
          {selectedLayerData && (
            <p className="layer-2d-info">
              Layer {layerAxis.toUpperCase()}={selectedLayerData.layer_index} (
              {selectedLayerData.num_voxels} voxels)
            </p>
          )}
        </div>

        {/* Voxel Editor Section */}
        <div className="voxel-editor-section">
          <h5>Voxel Properties</h5>

          {selectedVoxel ? (
            <>
              <p className="selected-voxel-info">
                Selected: Voxel #{selectedVoxelIndex} at (
                {selectedVoxel.x.toFixed(2)}, {selectedVoxel.y.toFixed(2)},{' '}
                {selectedVoxel.z.toFixed(2)})
              </p>

              <div className="voxel-editor-grid">
                {/* Left Column - Materials */}
                <div className="editor-column materials-column">
                  <h6>Material</h6>
                  <div className="material-grid">
                    {MATERIALS.map((mat) => (
                      <button
                        key={mat.id}
                        className={`material-square ${selectedMaterial === mat.id ? 'selected' : ''}`}
                        style={{ backgroundColor: mat.color }}
                        onClick={() => {
                          setSelectedMaterial(mat.id);
                          setHasChanges(true);
                        }}
                        title={mat.name}
                      >
                        {mat.id}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Side - Magnetization Angles */}
                <div className="editor-column angles-column">
                  <h6>Magnetization Angle</h6>
                  <div className="angles-grid">
                    {/* X Angle */}
                    <div className="angle-column">
                      <span className="angle-label">X</span>
                      <div className="angle-squares">
                        {ANGLE_PRESETS.x.map((angle) => (
                          <button
                            key={angle}
                            className={`angle-square ${selectedAngleX === angle ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedAngleX(angle);
                              setHasChanges(true);
                            }}
                          >
                            {angle}°
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Y Angle */}
                    <div className="angle-column">
                      <span className="angle-label">Y</span>
                      <div className="angle-squares">
                        {ANGLE_PRESETS.y.map((angle) => (
                          <button
                            key={angle}
                            className={`angle-square ${selectedAngleY === angle ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedAngleY(angle);
                              setHasChanges(true);
                            }}
                          >
                            {angle}°
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Z Angle */}
                    <div className="angle-column">
                      <span className="angle-label">Z</span>
                      <div className="angle-squares">
                        {ANGLE_PRESETS.z.map((angle) => (
                          <button
                            key={angle}
                            className={`angle-square ${selectedAngleZ === angle ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedAngleZ(angle);
                              setHasChanges(true);
                            }}
                          >
                            {angle}°
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Favourite Angles */}
                    <div className="angle-column">
                      <span className="angle-label">★</span>
                      <div className="angle-squares">
                        {ANGLE_PRESETS.favourite.map((angle) => (
                          <button
                            key={angle}
                            className={`angle-square favourite`}
                            onClick={() => {
                              setSelectedAngleZ(angle);
                              setHasChanges(true);
                            }}
                          >
                            {angle}°
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="voxel-editor-actions">
                <button
                  className="confirm-button material-button"
                  onClick={handleConfirm}
                  disabled={!hasChanges || loading}
                  title="Update the material of this voxel"
                >
                  {loading ? 'Saving...' : 'Update Material'}
                </button>
                <button
                  className="confirm-button magnetization-button"
                  onClick={handleConfirmMagnetization}
                  disabled={!hasChanges || loading}
                  title="Update the magnetization angle of this voxel"
                >
                  {loading ? 'Saving...' : 'Update Magnetization'}
                </button>
              </div>
            </>
          ) : (
            <p className="no-voxel-selected">
              Click on a voxel in the 2D view to edit its properties
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
