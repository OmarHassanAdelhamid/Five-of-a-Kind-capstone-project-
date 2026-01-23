import { useCallback, useEffect, useState } from 'react';
import {
  fetchLayers,
  fetchLayer,
  updateLayer,
  type LayersResponse,
  type LayerResponse,
} from '../utils/api';

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
  const [internalSelectedLayerZ, setInternalSelectedLayerZ] = useState<
    number | null
  >(null);

  const selectedLayerZ =
    externalSelectedLayerZ !== undefined
      ? externalSelectedLayerZ
      : internalSelectedLayerZ;
  const [selectedLayerData, setSelectedLayerData] =
    useState<LayerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

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
      if (!projectName.trim() || disabled) return;

      setLoading(true);
      setError(null);
      try {
        const data = await fetchLayer(projectName, layerZ, voxelSize, layerAxis);
        setSelectedLayerData(data);
        setInternalSelectedLayerZ(layerZ);
        onLayerSelect?.(layerZ);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load layer');
        setSelectedLayerData(null);
      } finally {
        setLoading(false);
      }
    },
    [projectName, voxelSize, layerAxis, disabled, onLayerSelect],
  );

  const handleLayerClick = useCallback(
    (layerZ: number) => {
      if (selectedLayerZ === layerZ) {
        setInternalSelectedLayerZ(null);
        setSelectedLayerData(null);
        onLayerSelect?.(null);
      } else {
        loadLayer(layerZ);
      }
    },
    [selectedLayerZ, loadLayer, onLayerSelect],
  );

  const handleSaveLayer = useCallback(async () => {
    if (!selectedLayerData || !projectName.trim()) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await updateLayer({
        project_name: projectName,
        layer_value: selectedLayerData.layer_value,
        voxels: selectedLayerData.voxels,
        voxel_size: voxelSize,
        axis: layerAxis,
      });
      setMessage('Layer saved successfully!');
      setEditing(false);
      await loadLayers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save layer');
    } finally {
      setLoading(false);
    }
  }, [selectedLayerData, projectName, voxelSize, layerAxis, loadLayers]);

  const handleDeleteVoxel = useCallback(
    (index: number) => {
      if (!selectedLayerData) return;

      const newVoxels = selectedLayerData.voxels.filter((_, i) => i !== index);
      setSelectedLayerData({
        ...selectedLayerData,
        voxels: newVoxels,
        num_voxels: newVoxels.length,
      });
      setEditing(true);
    },
    [selectedLayerData],
  );

  useEffect(() => {
    if (
      externalSelectedLayerZ !== undefined &&
      externalSelectedLayerZ !== null &&
      projectName.trim() &&
      !disabled
    ) {
      loadLayer(externalSelectedLayerZ);
    } else if (externalSelectedLayerZ === null) {
      setSelectedLayerData(null);
      setInternalSelectedLayerZ(null);
    }
  }, [externalSelectedLayerZ, projectName, disabled, loadLayer]);

  useEffect(() => {
    if (projectName.trim() && !disabled) {
      loadLayers();
    } else {
      setLayersData(null);
      setInternalSelectedLayerZ(null);
      setSelectedLayerData(null);
    }
  }, [projectName, disabled, layerAxis, loadLayers]);

  if (!isOpen) {
    return null;
  }

  if (!projectName.trim() || disabled) {
    return (
      <div className="layer-editor-panel">
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

  return (
    <div className="layer-editor-panel">
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

        {layersData && (
          <>
            <div className="layers-list">
              <h4>Layers ({layersData.num_layers})</h4>
              <div className="layers-scroll">
                {layersData.layers.length === 0 ? (
                  <p className="empty-message">No layers found</p>
                ) : (
                  layersData.layers.map((layer) => (
                    <div
                      key={layer.layer_value}
                      className={`layer-item ${selectedLayerZ === layer.layer_value ? 'selected' : ''}`}
                      onClick={() => handleLayerClick(layer.layer_value)}
                    >
                      <div className="layer-item-content">
                        <span className="layer-z">
                          {layerAxis.toUpperCase()}: {layer.layer_value.toFixed(3)}
                        </span>
                        <span className="layer-count">
                          {layer.num_voxels} voxels
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedLayerData && (
              <div className="layer-details">
                <h4>
                  Layer {layerAxis.toUpperCase()}: {selectedLayerData.layer_value.toFixed(3)} (
                  {selectedLayerData.num_voxels} voxels)
                </h4>
                {editing && (
                  <div className="editing-indicator">
                    <span>✏️ Editing mode</span>
                  </div>
                )}
                <div className="layer-actions">
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      disabled={loading}
                      className="edit-button"
                    >
                      Edit Layer
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveLayer}
                        disabled={loading}
                        className="save-button"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setEditing(false);
                          loadLayer(selectedLayerData.layer_value);
                        }}
                        disabled={loading}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
                <div className="voxels-list">
                  <h5>Voxels in this layer:</h5>
                  <div className="voxels-scroll">
                    {selectedLayerData.voxels.length === 0 ? (
                      <p className="empty-message">No voxels in this layer</p>
                    ) : (
                      selectedLayerData.voxels.map((voxel, index) => (
                        <div key={index} className="voxel-item">
                          <span className="voxel-coords">
                            ({voxel[0].toFixed(3)}, {voxel[1].toFixed(3)},{' '}
                            {voxel[2].toFixed(3)})
                          </span>
                          <span className="voxel-meta">
                            M:{voxel[3].toFixed(2)} A:{voxel[4].toFixed(2)}{' '}
                            ID:
                            {voxel[5]}
                          </span>
                          {editing && (
                            <button
                              onClick={() => handleDeleteVoxel(index)}
                              className="delete-voxel-button"
                              title="Delete voxel"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
