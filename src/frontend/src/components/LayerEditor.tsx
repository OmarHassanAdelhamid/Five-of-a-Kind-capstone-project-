import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  fetchLayers,
  fetchLayer,
  updateVoxels,
  type LayersResponse,
  type LayerResponse,
  type LayerVoxel,
  type VoxelPropertiesClipboard,
} from '../utils/api';
import { Layer2DGrid } from '../components/Layer2DGrid';

export interface LayerEditorHandle {
  getSelectionProperties: () => VoxelPropertiesClipboard | null;
  applyPaste: (props: VoxelPropertiesClipboard) => Promise<void>;
  selectAllInLayer: () => void;
}

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

// Material options with colors
const MATERIALS = [
  { id: 1, name: 'Material 1', color: '#ef4444' }, // Red
  { id: 2, name: 'Material 2', color: '#f97316' }, // Orange
  { id: 3, name: 'Material 3', color: '#eab308' }, // Yellow
  { id: 4, name: 'Material 4', color: '#22c55e' }, // Green
  { id: 5, name: 'Material 5', color: '#3b82f6' }, // Blue
  { id: 6, name: 'Material 6', color: '#8b5cf6' }, // Purple
];

export const LayerEditor = forwardRef<LayerEditorHandle, LayerEditorProps>(
  function LayerEditor(
    {
      projectName,
      partitionName,
      voxelSize,
      layerAxis = 'z',
      onLayerSelect,
      selectedLayerZ: externalSelectedLayerZ,
      disabled = false,
      isOpen,
      onClose,
      onVoxelsChanged,
    },
    ref,
  ) {
    const [layersData, setLayersData] = useState<LayersResponse | null>(null);
    const [selectedLayerData, setSelectedLayerData] =
      useState<LayerResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [selectedVoxelIndices, setSelectedVoxelIndices] = useState<
      Set<number>
    >(new Set());
    const [selectedMaterial, setSelectedMaterial] = useState<number>(1);
    const [selectedTheta, setSelectedTheta] = useState<number>(90);
    const [selectedPhi, setSelectedPhi] = useState<number>(0);
    const [displayTheta, setDisplayTheta] = useState<string>('90');
    const [displayPhi, setDisplayPhi] = useState<string>('0');
    const [hasChanges, setHasChanges] = useState(false);
    const [editVoxelsMode, setEditVoxelsMode] = useState(false);
    const didAutoSelectFirstLayerRef = useRef(false);

    const [showMagnetizedOnly, setShowMagnetizedOnly] = useState(false);

    const loadLayers = useCallback(async () => {
      if (!projectName.trim() || !partitionName || disabled) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchLayers(
          projectName,
          partitionName,
          layerAxis,
        );
        setLayersData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load layers');
        setLayersData(null);
      } finally {
        setLoading(false);
      }
    }, [projectName, partitionName, layerAxis, disabled]);

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
          );
          console.log(
            `[LayerEditor] fetchLayer returned layer_index: ${data.layer_index}`,
          );
          setSelectedLayerData(data);
          setSelectedVoxelIndices(new Set()); // clear selection when switching layer
          onLayerSelect?.(layerZ);
        } catch (err) {
          console.error(`[LayerEditor] fetchLayer error:`, err);
          setError(err instanceof Error ? err.message : 'Failed to load layer');
          setSelectedLayerData(null);
          setSelectedVoxelIndices(new Set());
        } finally {
          setLoading(false);
        }
      },
      [
        projectName,
        partitionName,
        layerAxis,
        disabled,
        onLayerSelect,
      ],
    );

    const syncMagnetizationDisplay = useCallback(
      (theta: number, phi: number) => {
        setDisplayTheta(String(theta));
        setDisplayPhi(String(phi));
      },
      [],
    );

    const handleVoxelSelect = useCallback(
      (voxel: LayerVoxel | null, index: number) => {
        if (voxel && index >= 0) {
          setSelectedVoxelIndices(new Set([index]));
          setSelectedMaterial(voxel.material || 1);
          const phi = voxel.azimuthAngle ?? 0;
          const theta = voxel.polarAngle ?? 90;
          setSelectedPhi(phi);
          setSelectedTheta(theta);
          syncMagnetizationDisplay(theta, phi);
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
          const phi = first.azimuthAngle ?? 0;
          const theta = first.polarAngle ?? 90;
          setSelectedPhi(phi);
          setSelectedTheta(theta);
          syncMagnetizationDisplay(theta, phi);
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

        setMessage(
          `Material updated for ${selectedVoxelIndices.size} voxel(s)!`,
        );
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
    }, [
      selectedVoxelIndices,
      selectedLayerData,
      selectedMaterial,
      projectName,
      partitionName,
    ]);

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

      // Backend expects polar: [polar (θ), azimuth (φ)]
      const magnetization: [number, number] = [
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

        const [updatedTheta, updatedPhi] = magnetization;
        const updatedVoxels = [...selectedLayerData.voxels];
        for (const idx of selectedVoxelIndices) {
          if (updatedVoxels[idx]) {
            updatedVoxels[idx] = {
              ...updatedVoxels[idx],
              polarAngle: updatedTheta,
              azimuthAngle: updatedPhi,
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
      displayTheta,
      displayPhi,
      projectName,
      partitionName,
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

    const handleVoxelAdd = useCallback(
      async (gridX: number, gridY: number) => {
        if (!selectedLayerData || !partitionName) return;
        const voxels = selectedLayerData.voxels ?? [];
        const first = voxels[0];
        if (first == null) return;

        let vs = voxelSize ?? 0.1;
        let ox = first.x - first.ix * vs;
        let oy = first.y - first.iy * vs;
        let oz = first.z - first.iz * vs;
        if (voxels.length >= 2) {
          const a = voxels[0];
          const b = voxels[1];
          if (a.ix !== b.ix) {
            const vsx = (a.x - b.x) / (a.ix - b.ix);
            if (Number.isFinite(vsx)) {
              vs = vsx;
              ox = a.x - a.ix * vs;
            }
          }
          if (a.iy !== b.iy) {
            const vsy = (a.y - b.y) / (a.iy - b.iy);
            if (Number.isFinite(vsy)) oy = a.y - a.iy * vsy;
          }
          if (a.iz !== b.iz) {
            const vsz = (a.z - b.z) / (a.iz - b.iz);
            if (Number.isFinite(vsz)) oz = a.z - a.iz * vsz;
          }
        }

        const desiredX = Math.round(gridX) * vs + ox;
        const desiredY = Math.round(gridY) * vs + oy;
        const desiredZ = first.z;

        const ix = Math.round((desiredX - ox) / vs);
        const iy = Math.round((desiredY - oy) / vs);
        const iz = Math.round((desiredZ - oz) / vs);

        let coords: [number, number, number];
        console.log(
          `[LayerEditor] Adding voxel at (ix, iy, iz) = (${ix}, ${iy}, ${iz})`,
        );
        if (layerAxis === 'z') {
          coords = [ix, iy, iz];
        } else if (layerAxis === 'x') {
          coords = [iz, ix, iy];
        } else {
          coords = [ix, iz, iy];
        }
        console.log(
          `[LayerEditor] Adding voxel at coords = (${coords[0]}, ${coords[1]}, ${coords[2]})`,
        );
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
          await updateVoxels({
            project_name: projectName,
            partition_name: partitionName,
            voxels: [coords],
            action: 'add',
            materialID: selectedMaterial,
          });
          setMessage('Voxel added.');
          if (
            externalSelectedLayerZ !== undefined &&
            externalSelectedLayerZ !== null
          ) {
            await loadLayer(externalSelectedLayerZ);
          }
          await onVoxelsChanged?.();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to add voxel');
        } finally {
          setLoading(false);
        }
      },
      [
        selectedLayerData,
        partitionName,
        projectName,
        layerAxis,
        voxelSize,
        selectedMaterial,
        externalSelectedLayerZ,
        loadLayer,
        onVoxelsChanged,
      ],
    );

    const handleVoxelRemove = useCallback(
      async (index: number) => {
        if (!selectedLayerData?.voxels?.[index] || !partitionName) return;
        const v = selectedLayerData.voxels[index];
        const coords: [number, number, number] = [
          Math.round(v.ix),
          Math.round(v.iy),
          Math.round(v.iz),
        ];
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
          await updateVoxels({
            project_name: projectName,
            partition_name: partitionName,
            voxels: [coords],
            action: 'delete',
          });
          setMessage('Voxel removed.');
          setSelectedVoxelIndices((prev) => {
            const next = new Set(prev);
            next.delete(index);
            return next;
          });
          if (
            externalSelectedLayerZ !== undefined &&
            externalSelectedLayerZ !== null
          ) {
            await loadLayer(externalSelectedLayerZ);
          }
          await onVoxelsChanged?.();
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Failed to remove voxel',
          );
        } finally {
          setLoading(false);
        }
      },
      [
        selectedLayerData,
        partitionName,
        projectName,
        externalSelectedLayerZ,
        loadLayer,
        onVoxelsChanged,
      ],
    );

    const handleVoxelsAdd = useCallback(
      async (cells: { gridX: number; gridY: number }[]) => {
        if (!selectedLayerData || !partitionName || cells.length === 0) return;
        const voxels = selectedLayerData.voxels ?? [];
        const first = voxels[0];
        if (first == null) return;

        let vs = voxelSize ?? 0.1;
        let ox = first.x - first.ix * vs;
        let oy = first.y - first.iy * vs;
        let oz = first.z - first.iz * vs;
        if (voxels.length >= 2) {
          const a = voxels[0];
          const b = voxels[1];
          if (a.ix !== b.ix) {
            const vsx = (a.x - b.x) / (a.ix - b.ix);
            if (Number.isFinite(vsx)) {
              vs = vsx;
              ox = a.x - a.ix * vs;
            }
          }
          if (a.iy !== b.iy) {
            const vsy = (a.y - b.y) / (a.iy - b.iy);
            if (Number.isFinite(vsy)) oy = a.y - a.iy * vsy;
          }
          if (a.iz !== b.iz) {
            const vsz = (a.z - b.z) / (a.iz - b.iz);
            if (Number.isFinite(vsz)) oz = a.z - a.iz * vsz;
          }
        }

        const coords: [number, number, number][] = cells.map(
          ({ gridX, gridY }) => {
            const desiredX = Math.round(gridX) * vs + ox;
            const desiredY = Math.round(gridY) * vs + oy;
            const desiredZ = first.z;
            const ix = Math.round((desiredX - ox) / vs);
            const iy = Math.round((desiredY - oy) / vs);
            const iz = Math.round((desiredZ - oz) / vs);
            if (layerAxis === 'z') return [ix, iy, iz];
            if (layerAxis === 'x') return [iz, ix, iy];
            return [ix, iz, iy];
          },
        );

        setLoading(true);
        setError(null);
        setMessage(null);
        try {
          await updateVoxels({
            project_name: projectName,
            partition_name: partitionName,
            voxels: coords,
            action: 'add',
            materialID: selectedMaterial,
          });
          setMessage(`${cells.length} voxel(s) added.`);
          if (
            externalSelectedLayerZ !== undefined &&
            externalSelectedLayerZ !== null
          ) {
            await loadLayer(externalSelectedLayerZ);
          }
          await onVoxelsChanged?.();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to add voxels');
        } finally {
          setLoading(false);
        }
      },
      [
        selectedLayerData,
        partitionName,
        projectName,
        layerAxis,
        voxelSize,
        selectedMaterial,
        externalSelectedLayerZ,
        loadLayer,
        onVoxelsChanged,
      ],
    );

    const handleVoxelsRemove = useCallback(
      async (indices: number[]) => {
        if (
          !selectedLayerData?.voxels ||
          !partitionName ||
          indices.length === 0
        )
          return;
        const voxelList = selectedLayerData.voxels;
        const coords: [number, number, number][] = indices
          .filter((i) => voxelList[i] != null)
          .map((i) => [
            Math.round(voxelList[i].ix),
            Math.round(voxelList[i].iy),
            Math.round(voxelList[i].iz),
          ]);

        setLoading(true);
        setError(null);
        setMessage(null);
        try {
          await updateVoxels({
            project_name: projectName,
            partition_name: partitionName,
            voxels: coords,
            action: 'delete',
          });
          setMessage(`${indices.length} voxel(s) removed.`);
          setSelectedVoxelIndices(new Set());
          if (
            externalSelectedLayerZ !== undefined &&
            externalSelectedLayerZ !== null
          ) {
            await loadLayer(externalSelectedLayerZ);
          }
          await onVoxelsChanged?.();
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Failed to remove voxels',
          );
        } finally {
          setLoading(false);
        }
      },
      [
        selectedLayerData,
        partitionName,
        projectName,
        externalSelectedLayerZ,
        loadLayer,
        onVoxelsChanged,
      ],
    );

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
        setSelectedVoxelIndices(new Set());
      }
    }, [externalSelectedLayerZ, projectName, disabled, loadLayer]);

    useEffect(() => {
      if (projectName.trim() && !disabled) {
        loadLayers();
      } else {
        setLayersData(null);
        setSelectedLayerData(null);
        setSelectedVoxelIndices(new Set());
      }
    }, [projectName, disabled, layerAxis, loadLayers]);

    // When opened with no layer selected (e.g. from context menu), select first layer
    useEffect(() => {
      if (!isOpen) {
        didAutoSelectFirstLayerRef.current = false;
        return;
      }
      if (
        externalSelectedLayerZ === null &&
        layersData?.layers?.length &&
        !didAutoSelectFirstLayerRef.current &&
        projectName.trim() &&
        partitionName &&
        !disabled
      ) {
        const first = layersData.layers[0];
        if (first != null) {
          didAutoSelectFirstLayerRef.current = true;
          onLayerSelect?.(first.coordinate);
          loadLayer(first.coordinate);
        }
      }
    }, [
      isOpen,
      externalSelectedLayerZ,
      layersData,
      projectName,
      partitionName,
      disabled,
      onLayerSelect,
      loadLayer,
    ]);

    useEffect(() => {
      if (message) {
        const timer = setTimeout(() => setMessage(null), 3000);
        return () => clearTimeout(timer);
      }
    }, [message]);

    const selectAllInLayer = useCallback(() => {
      if (selectedLayerData && selectedLayerData.voxels.length > 0) {
        setSelectedVoxelIndices(
          new Set(selectedLayerData.voxels.map((_, i) => i)),
        );
      }
    }, [selectedLayerData]);

    const getSelectionProperties =
      useCallback((): VoxelPropertiesClipboard | null => {
        if (selectedVoxelIndices.size === 0 || !selectedLayerData) return null;
        const firstIdx = Array.from(selectedVoxelIndices)[0];
        const v = selectedLayerData.voxels[firstIdx];
        if (!v) return null;
        return {
          material: v.material ?? 1,
          polarAngle: v.polarAngle ?? 90,
          azimuthAngle: v.azimuthAngle ?? 0,
        };
      }, [selectedVoxelIndices, selectedLayerData]);

    const applyPaste = useCallback(
      async (props: VoxelPropertiesClipboard) => {
        if (
          selectedVoxelIndices.size === 0 ||
          !selectedLayerData ||
          !partitionName
        )
          return;
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
          await updateVoxels({
            project_name: projectName,
            partition_name: partitionName,
            voxels: voxelCoords,
            action: 'update',
            materialID: props.material,
          });
          await updateVoxels({
            project_name: projectName,
            partition_name: partitionName,
            voxels: voxelCoords,
            action: 'update',
            magnetization: [props.polarAngle, props.azimuthAngle] as [
              number,
              number,
            ],
          });
          const updatedVoxels = [...selectedLayerData.voxels];
          for (const idx of selectedVoxelIndices) {
            if (updatedVoxels[idx]) {
              updatedVoxels[idx] = {
                ...updatedVoxels[idx],
                material: props.material,
                polarAngle: props.polarAngle,
                azimuthAngle: props.azimuthAngle,
              };
            }
          }
          setSelectedLayerData({ ...selectedLayerData, voxels: updatedVoxels });
          setMessage(
            `Pasted properties to ${selectedVoxelIndices.size} voxel(s).`,
          );
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Failed to paste properties',
          );
        } finally {
          setLoading(false);
        }
      },
      [selectedVoxelIndices, selectedLayerData, projectName, partitionName],
    );

    useImperativeHandle(
      ref,
      () => ({
        getSelectionProperties,
        applyPaste,
        selectAllInLayer,
      }),
      [getSelectionProperties, applyPaste, selectAllInLayer],
    );

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
                  editVoxelsMode={editVoxelsMode}
                  onVoxelAdd={editVoxelsMode ? handleVoxelAdd : undefined}
                  onVoxelRemove={editVoxelsMode ? handleVoxelRemove : undefined}
                  onVoxelsAdd={editVoxelsMode ? handleVoxelsAdd : undefined}
                  onVoxelsRemove={
                    editVoxelsMode ? handleVoxelsRemove : undefined
                  }
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
            <div className="layer-header-block">
              {selectedLayerData && (
                <p className="layer-2d-info">
                  Layer {layerAxis.toUpperCase()}={selectedLayerData.layer_index}{' '}
                  ({selectedLayerData.num_voxels} voxels)
                </p>
              )}
                <div className="layer-toggle-row">
                  <p className="layer-toggle-label">
                    Show All Magnetized Voxels
                  </p>

                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={showMagnetizedOnly}
                      onChange={() => setShowMagnetizedOnly((v) => !v)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
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
                      {selectedVoxel.x.toFixed(2)}, {selectedVoxel.y.toFixed(2)}
                      , {selectedVoxel.z.toFixed(2)})
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
  },
);
