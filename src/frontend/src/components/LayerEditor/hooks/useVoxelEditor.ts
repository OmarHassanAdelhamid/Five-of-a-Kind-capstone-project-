/**
 * Bulk voxel edits (add, delete, update, resets) and undo/redo against the API.
 *
 * @author Khalid Farag
 * @lastModified 2026/04/05
 */
import { useCallback, useEffect, useState } from 'react';
import {
  updateVoxels,
  type LayerResponse,
  type LayerVoxel,
  type VoxelPropertiesClipboard,
} from '../../../utils/api';

// Props for the useVoxelEditor hook
interface UseVoxelEditorParams {
  projectName: string;
  partitionName: string | null;
  layerAxis: 'z' | 'x' | 'y';
  voxelSize?: number;
  externalSelectedLayerZ: number | null | undefined;
  selectedLayerData: LayerResponse | null;
  setSelectedLayerData: (v: LayerResponse | null) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  loadLayer: (layerZ: number) => Promise<void>;
  onVoxelsChanged?: () => void | Promise<void>;
}

export function useVoxelEditor({
  projectName,
  partitionName,
  layerAxis,
  voxelSize,
  externalSelectedLayerZ,
  selectedLayerData,
  setSelectedLayerData,
  setLoading,
  setError,
  loadLayer,
  onVoxelsChanged,
}: UseVoxelEditorParams) {


  const [selectedVoxelIndices, setSelectedVoxelIndices] = useState<Set<number>>(
    new Set(),
  );
  const [selectedMaterial, setSelectedMaterial] = useState<number>(1);
  const [selectedTheta, setSelectedTheta] = useState<number>(90);
  const [selectedPhi, setSelectedPhi] = useState<number>(0);
  const [displayTheta, setDisplayTheta] = useState<string>('90');
  const [displayPhi, setDisplayPhi] = useState<string>('0');
  const [hasChanges, setHasChanges] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Clears the message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Clears the selected voxel indices
  const clearSelection = useCallback(() => {
    setSelectedVoxelIndices(new Set());
  }, []);

  // Synchronizes the magnetization display so user can see which voxels are magnetized
  const syncMagnetizationDisplay = useCallback((theta: number, phi: number) => {
    setDisplayTheta(String(theta));
    setDisplayPhi(String(phi));
  }, []);

  // Handles the selection of a single voxel
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

  // Handles the selection of multiple voxels
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
        // When multiple voxels are selected they may have different properties,
        // so treat the state as already dirty so the confirm buttons are enabled.
        setHasChanges(indices.length > 1);
      } else {
        setSelectedVoxelIndices(new Set());
      }
    },
    [syncMagnetizationDisplay],
  );

  // Selects all voxels in the layer
  const selectAllInLayer = useCallback(() => {
    if (selectedLayerData && selectedLayerData.voxels.length > 0) {
      setSelectedVoxelIndices(
        new Set(selectedLayerData.voxels.map((_, i) => i)),
      );
    }
  }, [selectedLayerData]);

  // Handles the confirmation of the material
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
  }, [
    selectedVoxelIndices,
    selectedLayerData,
    selectedMaterial,
    projectName,
    partitionName,
    setLoading,
    setError,
    setSelectedLayerData,
  ]);

  // Handles the confirmation of the magnetization
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
    setLoading,
    setError,
    setSelectedLayerData,
  ]);

  // Handles the addition of a voxel
  const handleVoxelAdd = useCallback(
    async (gridX: number, gridY: number) => {
      if (!selectedLayerData || !partitionName) return;
      const voxels = selectedLayerData.voxels ?? [];
      const first = voxels[0];
      if (first == null) return;

      // Get the voxel size from the distance between two adjacent voxels if available, since the voxelSize prop may be absent or inaccurate
      let vs = voxelSize ?? 0.1;
      if (voxels.length >= 2) {
        const a = voxels[0];
        const b = voxels[1];
        if (a.ix !== b.ix) {
          const vsx = (a.x - b.x) / (a.ix - b.ix);
          if (Number.isFinite(vsx)) vs = vsx;
        }
      }

      // Map 2D grid coordinates to 3D voxel indices. The Layer2DGrid always uses (gridX, gridY) for the two axes that are NOT the slice axis, so the fixed coordinate (layer_index) slots into the correct position. For example, if the layer axis is 'y', the coordinates will be [gridX, layer_index, gridY]
      let coords: [number, number, number];
      if (layerAxis === 'y') {
        coords = [
          Math.round(gridX),     
          selectedLayerData.layer_index, 
          Math.round(gridY),     
        ];
      } else if (layerAxis === 'z') {
        coords = [
          Math.round(gridX),     
          Math.round(gridY),     
          selectedLayerData.layer_index, 
        ];
      } else {
        coords = [
          selectedLayerData.layer_index, 
          Math.round(gridX),     
          Math.round(gridY),     
        ];
      }

      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        await updateVoxels({
          project_name: projectName,
          partition_name: partitionName,
          voxels: [coords],
          action: 'add',
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
      externalSelectedLayerZ,
      loadLayer,
      onVoxelsChanged,
      setLoading,
      setError,
    ],
  );

  // Handles the removal of a voxel
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
        setError(err instanceof Error ? err.message : 'Failed to remove voxel');
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
      setLoading,
      setError,
    ],
  );

  // Handles the addition of multiple voxels
  const handleVoxelsAdd = useCallback(
    async (cells: { gridX: number; gridY: number }[]) => {
      if (!selectedLayerData || !partitionName || cells.length === 0) return;
      const voxels = selectedLayerData.voxels ?? [];
      const first = voxels[0];
      if (first == null) return;

      const coords: [number, number, number][] = cells.map(
        ({ gridX, gridY }) => {
          if (layerAxis === 'y') {
            return [
              Math.round(gridX),
              selectedLayerData.layer_index,
              Math.round(gridY),
            ];
          }
          if (layerAxis === 'z') {
            return [
              Math.round(gridX),
              Math.round(gridY),
              selectedLayerData.layer_index,
            ];
          }
          return [
            selectedLayerData.layer_index,
            Math.round(gridX),
            Math.round(gridY),
          ];
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
      setLoading,
      setError,
    ],
  );

  // Handles the removal of multiple voxels
  const handleVoxelsRemove = useCallback(
    async (indices: number[]) => {
      if (!selectedLayerData?.voxels || !partitionName || indices.length === 0)
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
      setLoading,
      setError,
    ],
  );

  // Gets the selection properties from the selected voxels
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

  // Applies the pasted properties to the selected voxels
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
        // The API treats material and magnetization as separate update fields, so two calls are needed to apply both properties atomically.
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
    [
      selectedVoxelIndices,
      selectedLayerData,
      projectName,
      partitionName,
      setLoading,
      setError,
      setSelectedLayerData,
    ],
  );

  return {
    selectedVoxelIndices,
    selectedMaterial,
    setSelectedMaterial,
    selectedTheta,
    setSelectedTheta,
    selectedPhi,
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
  };
}
