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
  partitionName: string | null;
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

export const LayerEditor = ({
  projectName,
  partitionName,
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

  const [selectedVoxelIndices, setSelectedVoxelIndices] = useState<Set<number>>(
    new Set(),
  );
  const [selectedMaterial, setSelectedMaterial] = useState<number>(1);
  const [selectedTheta, setSelectedTheta] = useState<number>(90);
  const [selectedPhi, setSelectedPhi] = useState<number>(0);
  const [selectedMagnitude, setSelectedMagnitude] = useState<number>(1);
  const [displayTheta, setDisplayTheta] = useState<string>('90');
  const [displayPhi, setDisplayPhi] = useState<string>('0');
  const [displayMagnitude, setDisplayMagnitude] = useState<string>('1');
  const [hasChanges, setHasChanges] = useState(false);

  const loadLayers = useCallback(async () => {
    if (!projectName.trim() || !partitionName || disabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLayers(projectName, partitionName, layerAxis, voxelSize);
      setLayersData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load layers');
      setLayersData(null);
    } finally {
      setLoading(false);
    }
  }, [projectName, partitionName, voxelSize, layerAxis, disabled]);

  const loadLayer = useCallback(
    async (layerZ: number) => {
      console.log(`[LayerEditor] loadLayer called with layerZ: ${layerZ}`);
      if (!projectName.trim() || !partitionName || disabled) {
        console.log(
          `[LayerEditor] loadLayer skipped - projectName/partitionName empty or disabled`,
        );
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchLayer(
          projectName,
          partitionName,
          layerZ,
          layerAxis,
          voxelSize,
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

  const syncMagnetizationDisplay = useCallback(
    (theta: number, phi: number, magnitude: number) => {
      setDisplayTheta(String(theta));
      setDisplayPhi(String(phi));
      setDisplayMagnitude(String(magnitude));
    },
    [],
  );

  const handleVoxelSelect = useCallback(
    (voxel: LayerVoxel | null, index: number) => {
      if (voxel && index >= 0) {
        setSelectedVoxelIndices(new Set([index]));
        setSelectedMaterial(voxel.material || 1);
        const mag = voxel.magnetization ?? 1;
        const phi = voxel.azimuthAngle ?? 0;
        const theta = voxel.polarAngle ?? 90;
        setSelectedMagnitude(mag);
        setSelectedPhi(phi);
        setSelectedTheta(theta);
        syncMagnetizationDisplay(theta, phi, mag);
        setHasChanges(false);
      } else {
        setSelectedVoxelIndices(new Set());
      }
    },
    [syncMagnetizationDisplay],
  );

  const handleVoxelsSelect = useCallback(
    (voxels: LayerVoxel[], indices: number[]) => {
      if (indices.length > 0) {
        setSelectedVoxelIndices(new Set(indices));
        const first = voxels[0];
        setSelectedMaterial(first.material || 1);
        const mag = first.magnetization ?? 1;
        const phi = first.azimuthAngle ?? 0;
        const theta = first.polarAngle ?? 90;
        setSelectedMagnitude(mag);
        setSelectedPhi(phi);
        setSelectedTheta(theta);
        syncMagnetizationDisplay(theta, phi, mag);
        setHasChanges(indices.length > 1);
      } else {
        setSelectedVoxelIndices(new Set());
      }
    },
    [syncMagnetizationDisplay],
  );

  const handleConfirmMaterial = useCallback(async () => {
    if (selectedVoxelIndices.size === 0 || !selectedLayerData) return;

    const voxelCoords: [number, number, number][] = Array.from(
      selectedVoxelIndices,
    ).map((idx) => {
      const v = selectedLayerData.voxels[idx];
      return [v.ix, v.iy, v.iz] as [number, number, number];
    });

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!partitionName) {
        setError('No partition selected');
        return;
      }
      await updateVoxels({
        project_name: projectName,
        partition_name: partitionName,
        voxels: voxelCoords,
        action: 'update',
        materialID: selectedMaterial,
      });

      const updatedVoxels = [...selectedLayerData.voxels];
      for (const idx of selectedVoxelIndices) {
        if (updatedVoxels[idx]) {
          updatedVoxels[idx] = {
            ...updatedVoxels[idx],
            material: selectedMaterial,
          };
        }
      }

      setMessage(`Material updated for ${selectedVoxelIndices.size} voxel(s)!`);
      setSelectedLayerData({ ...selectedLayerData, voxels: updatedVoxels });
      setSelectedVoxelIndices(new Set());
      setHasChanges(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update material',
      );
    } finally {
      setLoading(false);
    }
  }, [selectedVoxelIndices, selectedLayerData, selectedMaterial, projectName]);

  const handleConfirmMagnetization = useCallback(async () => {
    if (selectedVoxelIndices.size === 0 || !selectedLayerData) return;

    const voxelCoords: [number, number, number][] = Array.from(
      selectedVoxelIndices,
    ).map((idx) => {
      const v = selectedLayerData.voxels[idx];
      return [v.ix, v.iy, v.iz] as [number, number, number];
    });

    const theta = parseFloat(displayTheta);
    const phi = parseFloat(displayPhi);
    const magnitude = parseFloat(displayMagnitude);

    // Backend expects polar: [magnitude, polar (θ), azimuth (φ)]
    const magnetization: [number, number, number] = [
      Number.isNaN(magnitude) ? selectedMagnitude : magnitude,
      Number.isNaN(theta) ? selectedTheta : theta,
      Number.isNaN(phi) ? selectedPhi : phi,
    ];

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!partitionName) {
        setError('No partition selected');
        return;
      }
      await updateVoxels({
        project_name: projectName,
        partition_name: partitionName,
        voxels: voxelCoords,
        action: 'update',
        magnetization,
      });

      const [mag, theta, phi] = magnetization;
      const updatedVoxels = [...selectedLayerData.voxels];
      for (const idx of selectedVoxelIndices) {
        if (updatedVoxels[idx]) {
          updatedVoxels[idx] = {
            ...updatedVoxels[idx],
            magnetization: mag,
            polarAngle: theta,
            azimuthAngle: phi,
          };
        }
      }

      setMessage(
        `Magnetization updated for ${selectedVoxelIndices.size} voxel(s)!`,
      );
      setSelectedLayerData({ ...selectedLayerData, voxels: updatedVoxels });
      setSelectedVoxelIndices(new Set());
      setHasChanges(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update magnetization',
      );
    } finally {
      setLoading(false);
    }
  }, [
    selectedVoxelIndices,
    selectedLayerData,
    selectedTheta,
    selectedPhi,
    selectedMagnitude,
    displayTheta,
    displayPhi,
    displayMagnitude,
    projectName,
  ]);

  const handleRefresh = useCallback(() => {
    if (
      externalSelectedLayerZ !== undefined &&
      externalSelectedLayerZ !== null
    ) {
      loadLayer(externalSelectedLayerZ);
    }
    loadLayers();
  }, [externalSelectedLayerZ, loadLayer, loadLayers]);

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

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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

  const selectedIndicesArray = Array.from(selectedVoxelIndices);
  const selectedVoxel =
    selectedIndicesArray.length === 1 && selectedLayerData
      ? selectedLayerData.voxels[selectedIndicesArray[0]]
      : null;

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
          <h5>2D View</h5>
          {(() => {
            const layers = layersData?.layers ?? [];
            const currentIdx =
              selectedLayerData != null
                ? layers.findIndex(
                    (l) => l.index === selectedLayerData.layer_index,
                  )
                : -1;
            const canGoUp = currentIdx >= 0 && currentIdx < layers.length - 1;
            const canGoDown = currentIdx > 0;
            return (
              <Layer2DGrid
                layerData={selectedLayerData}
                width={500}
                height={400}
                materialColors={Object.fromEntries(
                  MATERIALS.map((m) => [m.id, m.color]),
                )}
                onVoxelSelect={handleVoxelSelect}
                onVoxelsSelect={handleVoxelsSelect}
                selectedVoxelIndices={selectedVoxelIndices}
                onLayerUp={() => {
                  if (canGoUp) loadLayer(layers[currentIdx + 1].coordinate);
                }}
                onLayerDown={() => {
                  if (canGoDown) loadLayer(layers[currentIdx - 1].coordinate);
                }}
                canGoUp={canGoUp}
                canGoDown={canGoDown}
              />
            );
          })()}
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

          {selectedVoxelIndices.size > 0 ? (
            <>
              <p className="selected-voxel-info">
                {selectedVoxelIndices.size === 1 && selectedVoxel ? (
                  <>
                    Selected: Voxel #{selectedIndicesArray[0]} at (
                    {selectedVoxel.x.toFixed(2)}, {selectedVoxel.y.toFixed(2)},{' '}
                    {selectedVoxel.z.toFixed(2)})
                  </>
                ) : (
                  <>Selected: {selectedVoxelIndices.size} voxels</>
                )}
              </p>

              <div className="voxel-editor-grid">
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

                <div className="editor-column angles-column">
                  <h6>Magnetization</h6>
                  <div className="magnetization-inputs">
                    <div className="magnetization-input-row">
                      <label htmlFor="theta-input">θ (polar) °</label>
                      <input
                        id="theta-input"
                        type="number"
                        min={0}
                        max={180}
                        step={0.1}
                        value={displayTheta}
                        onChange={(e) => {
                          setDisplayTheta(e.target.value);
                          const v = parseFloat(e.target.value);
                          if (!Number.isNaN(v)) setSelectedTheta(v);
                          setHasChanges(true);
                        }}
                        className="magnetization-input"
                      />
                    </div>
                    <div className="magnetization-input-row">
                      <label htmlFor="phi-input">φ (azimuth) °</label>
                      <input
                        id="phi-input"
                        type="number"
                        min={0}
                        max={360}
                        step={0.1}
                        value={displayPhi}
                        onChange={(e) => {
                          setDisplayPhi(e.target.value);
                          const v = parseFloat(e.target.value);
                          if (!Number.isNaN(v)) setSelectedPhi(v);
                          setHasChanges(true);
                        }}
                        className="magnetization-input"
                      />
                    </div>
                    <div className="magnetization-input-row">
                      <label htmlFor="magnitude-input">|M| (magnitude)</label>
                      <input
                        id="magnitude-input"
                        type="number"
                        min={0}
                        step={0.1}
                        value={displayMagnitude}
                        onChange={(e) => {
                          setDisplayMagnitude(e.target.value);
                          const v = parseFloat(e.target.value);
                          if (!Number.isNaN(v) && v >= 0)
                            setSelectedMagnitude(v);
                          setHasChanges(true);
                        }}
                        className="magnetization-input"
                      />
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
              Click or use lasso to select voxels in the 2D view
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
