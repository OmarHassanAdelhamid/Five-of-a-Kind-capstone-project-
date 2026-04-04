// This hook is used to load and manage layer data for the LayerEditor component

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchLayers,
  fetchLayer,
  type LayersResponse,
  type LayerResponse,
} from '../../../utils/api';

// Props for the useLayerData hook
interface UseLayerDataParams {
  projectName: string;
  partitionName: string | null;
  layerAxis: 'z' | 'x' | 'y';
  disabled: boolean;
  isOpen: boolean;
  externalSelectedLayerZ: number | null | undefined;
  onLayerSelect?: (layerZ: number | null) => void;
  onLayerChanged?: () => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setSelectedLayerData: (v: LayerResponse | null) => void;
}

export function useLayerData({
  projectName,
  partitionName,
  layerAxis,
  disabled,
  isOpen,
  externalSelectedLayerZ,
  onLayerSelect,
  onLayerChanged,
  setLoading,
  setError,
  setSelectedLayerData,
}: UseLayerDataParams) {

  // State for the layers data
  const [layersData, setLayersData] = useState<LayersResponse | null>(null);
  const didAutoSelectFirstLayerRef = useRef(false);

  // Loads the layers data
  const loadLayers = useCallback(async () => {
    if (!projectName.trim() || !partitionName || disabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLayers(projectName, partitionName, layerAxis);
      setLayersData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load layers');
      setLayersData(null);
    } finally {
      setLoading(false);
    }
  }, [projectName, partitionName, layerAxis, disabled, setLoading, setError]);

  // Loads a specific layer data
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
        onLayerSelect?.(layerZ);
        onLayerChanged?.();
      } catch (err) {
        console.error(`[LayerEditor] fetchLayer error:`, err);
        setError(err instanceof Error ? err.message : 'Failed to load layer');
        setSelectedLayerData(null);
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
      onLayerChanged,
      setLoading,
      setError,
      setSelectedLayerData,
    ],
  );

  // Three states for externalSelectedLayerZ:
  //   undefined  → no external controller; do nothing here (auto-select handles it)
  //   null       → controller explicitly deselected; clear the current layer
  //   number     → load that specific layer coordinate
  useEffect(() => {
    // If there is an external selected layer, load it
    if (
      externalSelectedLayerZ !== undefined &&
      externalSelectedLayerZ !== null &&
      projectName.trim() &&
      !disabled
    ) {
      loadLayer(externalSelectedLayerZ);
    } else if (externalSelectedLayerZ === null) {
      // If the external selected layer is null, clear the current layer
      setSelectedLayerData(null);
      onLayerChanged?.();
    }
  }, [
    externalSelectedLayerZ,
    projectName,
    disabled,
    loadLayer,
    setSelectedLayerData,
    onLayerChanged,
  ]);

  // Loads the layers data when the component mounts or when the project name or disabled state changes
  useEffect(() => {
    if (projectName.trim() && !disabled) {
      loadLayers();
    } else {
      setLayersData(null);
      setSelectedLayerData(null);
      onLayerChanged?.();
    }
  }, [
    projectName,
    disabled,
    layerAxis,
    loadLayers,
    setSelectedLayerData,
    onLayerChanged,
  ]);

  // When opened with no layer selected auto-select first layer
  useEffect(() => {
    // If the component is not open, return
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

  return { layersData, loadLayers, loadLayer };
}
