import { API_BASE_URL } from './constants';

export interface VoxelizedData {
  project_name?: string;
  coordinates?: number[][];
  num_voxels?: number;
}

export const fetchAvailableModels = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stl/list-stl`);
    if (!response.ok) {
      throw new Error(`Failed to fetch models (${response.status})`);
    }

    const modelList = (await response.json()) as string[];
    const filtered = modelList.filter((name) =>
      name.toLowerCase().endsWith('.stl'),
    );
    return filtered;
  } catch (error) {
    console.error('Failed to fetch STL models', error);
    throw error;
  }
};

export const fetchAvailableProjects = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/project/list`);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects (${response.status})`);
    }

    const data = (await response.json()) as { projects?: string[] };
    return data.projects ?? [];
  } catch (error) {
    console.error('Failed to fetch available projects', error);
    return [];
  }
};

export const fetchPartitions = async (projectName: string): Promise<string[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/project/partitions?project_name=${encodeURIComponent(projectName)}`,
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Failed to fetch partitions (${response.status})`,
      );
    }

    const data = (await response.json()) as { partitions?: string[] };
    return data.partitions ?? [];
  } catch (error) {
    console.error('Failed to fetch partitions', error);
    return [];
  }
};

export const fetchVoxelized = async (project: string, partitionName: string): Promise<number[][]> => {
  try {
    if (!partitionName) {
      throw new Error('Partition name is required');
    }
    const response = await fetch(
      `${API_BASE_URL}/api/project?project_name=${encodeURIComponent(project)}&partition_name=${encodeURIComponent(partitionName)}`,
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail ||
          `Failed to fetch voxelized data (${response.status})`,
      );
    }

    const data = (await response.json()) as VoxelizedData;

    if (data.coordinates) {
      return data.coordinates;
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch voxelized coordinates', error);
    throw error;
  }
};

export const uploadSTLFile = async (
  file: File,
): Promise<{ message?: string }> => {
  const formData = new FormData();
  formData.append('stl_file', file);

  const response = await fetch(`${API_BASE_URL}/api/stl/upload-stl`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Upload failed');
  }

  return (await response.json()) as { message?: string };
};

export interface VoxelizeRequest {
  stl_filename: string;
  voxel_size: number;
  project_name: string;
}

export const voxelizeModel = async (
  stlFilename: string,
  voxelSize: number,
  projectName: string,
): Promise<{ message?: string; projectpath?: string }> => {
  const requestBody: VoxelizeRequest = {
    stl_filename: stlFilename,
    voxel_size: voxelSize,
    project_name: projectName,
  };

  const response = await fetch(`${API_BASE_URL}/api/project`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.detail || errorData.message || 'Voxelization failed',
    );
  }

  return (await response.json()) as { message?: string; projectpath?: string };
};

export const downloadVoxelCSV = async (projectName: string, exportName: string): Promise<Blob> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/export?project_name=${encodeURIComponent(projectName)}&export_name=${encodeURIComponent(exportName)}`,
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Failed to download CSV (${response.status})`,
      );
    }

    return await response.blob();
  } catch (error) {
    console.log("Failed to export model", error);
    throw error;
  }
};

// Layer info from backend
export interface LayerInfo {
  index: number; // Grid index
  coordinate: number; // Real coordinate value
}

// Response from /api/edit/layers/{project_name}
export interface LayersResponse {
  project_name: string;
  num_layers: number;
  layers: LayerInfo[]; // Array of layer info with index and coordinate
  axis?: 'z' | 'x' | 'y';
}

export const fetchLayers = async (
  projectName: string,
  partitionName: string,
  axis: 'z' | 'x' | 'y' = 'z',
  _voxelSize?: number, // Unused but kept for interface compatibility
): Promise<LayersResponse> => {
  try {
    if (!partitionName) {
      throw new Error('Partition name is required');
    }
    const url = new URL(
      `${API_BASE_URL}/api/edit/layers/${encodeURIComponent(projectName)}`,
    );
    url.searchParams.set('axis', axis);
    url.searchParams.set('partition_name', partitionName);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Failed to fetch layers (${response.status})`,
      );
    }

    return (await response.json()) as LayersResponse;
  } catch (error) {
    console.error('Failed to fetch layers', error);
    throw error;
  }
};

// Voxel data structure from backend
// Backend returns: (ix, iy, iz, x, y, z, material, magnet_magnitude, magnet_polar, magnet_azimuth)
export interface LayerVoxel {
  ix: number; // Grid index X
  iy: number; // Grid index Y
  iz: number; // Grid index Z
  x: number; // Real coordinate X
  y: number; // Real coordinate Y
  z: number; // Real coordinate Z
  material: number;
  magnetization: number; // magnet_magnitude
  polarAngle: number; // magnet_polar (θ), degrees
  azimuthAngle: number; // magnet_azimuth (φ), degrees
  // Computed fields for 2D grid display
  grid_x?: number;
  grid_y?: number;
}

// Response from /api/edit/retrieve
export interface LayerResponse {
  project_name: string;
  layer_index: number;
  num_voxels: number;
  voxels: LayerVoxel[];
  axis?: 'z' | 'x' | 'y';
  // Computed bounds for 2D grid display
  bounds?: {
    grid_x_min: number;
    grid_x_max: number;
    grid_y_min: number;
    grid_y_max: number;
  };
}

// Transform raw voxel tuple from backend to LayerVoxel object
const transformVoxel = (raw: number[], axis: 'z' | 'x' | 'y'): LayerVoxel => {
  // Backend returns: [ix, iy, iz, x, y, z, material, magnet_magnitude, magnet_polar, magnet_azimuth]
  const [
    ix,
    iy,
    iz,
    x,
    y,
    z,
    material,
    magnet_magnitude,
    magnet_polar,
    magnet_azimuth,
  ] = raw;

  // For 2D grid display, we need to determine which coordinates to use
  // based on the axis (the axis coordinate is constant for the layer)
  let grid_x: number;
  let grid_y: number;

  if (axis === 'z') {
    grid_x = ix;
    grid_y = iy;
  } else if (axis === 'x') {
    grid_x = iy;
    grid_y = iz;
  } else {
    // axis === 'y'
    grid_x = ix;
    grid_y = iz;
  }

  return {
    ix,
    iy,
    iz,
    x,
    y,
    z,
    material,
    magnetization: magnet_magnitude,
    polarAngle: magnet_polar,
    azimuthAngle: magnet_azimuth,
    grid_x,
    grid_y,
  };
};

// Calculate bounds from voxels for 2D grid display
const calculateBounds = (voxels: LayerVoxel[]) => {
  if (voxels.length === 0) {
    return { grid_x_min: 0, grid_x_max: 1, grid_y_min: 0, grid_y_max: 1 };
  }

  const gridXs = voxels.map((v) => v.grid_x ?? 0);
  const gridYs = voxels.map((v) => v.grid_y ?? 0);

  return {
    grid_x_min: Math.min(...gridXs),
    grid_x_max: Math.max(...gridXs),
    grid_y_min: Math.min(...gridYs),
    grid_y_max: Math.max(...gridYs),
  };
};

// Cache for layer mappings to avoid fetching layers repeatedly
const layerMappingCache: Map<string, LayerInfo[]> = new Map();

// Helper to find the closest layer index for a given coordinate
const findClosestLayerIndex = (
  layers: LayerInfo[],
  targetCoordinate: number,
): number => {
  if (layers.length === 0) {
    throw new Error('No layers available');
  }

  // Use a small epsilon for floating-point comparison
  const EPSILON = 1e-9;

  // Find the layer with the closest coordinate value
  let closestLayer = layers[0];
  let closestDistance = Math.abs(layers[0].coordinate - targetCoordinate);

  for (let i = 1; i < layers.length; i++) {
    const layer = layers[i];
    const distance = Math.abs(layer.coordinate - targetCoordinate);
    // Use strict less than with epsilon consideration
    if (distance < closestDistance - EPSILON) {
      closestDistance = distance;
      closestLayer = layer;
    }
  }

  // Debug: log the match (will show in browser console)
  console.log(
    `[fetchLayer] targetCoordinate: ${targetCoordinate}, matched layer index: ${closestLayer.index}, layer coordinate: ${closestLayer.coordinate}`,
  );

  return closestLayer.index;
};

// Clear the layer cache (useful when project changes)
export const clearLayerCache = () => {
  layerMappingCache.clear();
};

export const fetchLayer = async (
  projectName: string,
  partitionName: string,
  layerValue: number, // This is the real coordinate value (e.g., 0.05) or layer index
  axis: 'z' | 'x' | 'y' = 'z',
  _voxelSize?: number, // Kept for interface compatibility
): Promise<LayerResponse> => {
  try {
    if (!partitionName) {
      throw new Error('Partition name is required');
    }
    
    // Get the layer mapping for this project
    const cacheKey = `${projectName}-${partitionName}-${axis}`;
    let layers = layerMappingCache.get(cacheKey);

    if (!layers) {
      // Fetch layers to get the mapping
      const layersResponse = await fetchLayers(projectName, partitionName, axis);
      layers = layersResponse.layers;
      layerMappingCache.set(cacheKey, layers);
      console.log(`[fetchLayer] Cached layers for ${cacheKey}:`, layers);
    }

    // Find the layer index that matches the coordinate
    const layerIndex = findClosestLayerIndex(layers, layerValue);

    // Use POST with JSON body for the retrieve endpoint
    const response = await fetch(`${API_BASE_URL}/api/edit/retrieve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_name: projectName,
        partition_name: partitionName,
        layer_index: layerIndex,
        axis: axis,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Failed to fetch layer (${response.status})`,
      );
    }

    const rawResponse = (await response.json()) as {
      project_name: string;
      layer_index: number;
      num_voxels: number;
      voxels: number[][];
      axis: 'z' | 'x' | 'y';
    };

    // Transform raw voxel data to LayerVoxel objects
    const voxels = rawResponse.voxels.map((raw) =>
      transformVoxel(raw, rawResponse.axis),
    );
    const bounds = calculateBounds(voxels);

    return {
      project_name: rawResponse.project_name,
      layer_index: rawResponse.layer_index,
      num_voxels: rawResponse.num_voxels,
      voxels,
      axis: rawResponse.axis,
      bounds,
    };
  } catch (error) {
    console.error('Failed to fetch layer', error);
    throw error;
  }
};

// Update action types matching backend
export type UpdateAction =
  | 'update'
  | 'reset_material'
  | 'reset_magnetization'
  | 'add'
  | 'delete';

export interface UpdateVoxelsRequest {
  project_name: string;
  partition_name: string;
  voxels: [number, number, number][]; // Grid coordinates: [ix, iy, iz][]
  action: UpdateAction;
  materialID?: number;
  magnetization?: [number, number, number];
}

export const updateVoxels = async (
  request: UpdateVoxelsRequest,
): Promise<{ message: string; project_name: string; num_voxels: number }> => {
  try {
    if (!request.partition_name) {
      throw new Error('Partition name is required');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/edit/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Failed to update voxels (${response.status})`,
      );
    }

    return (await response.json()) as {
      message: string;
      project_name: string;
      num_voxels: number;
    };
  } catch (error) {
    console.error('Failed to update voxels', error);
    throw error;
  }
};

export interface UpdateHistoryRequest {
  project_name: string;
  action: 'undo' | 'redo';
}
export const updateHistory = async (
  request: UpdateHistoryRequest,
): Promise<{ message: string; undo_empty: string; redo_empty: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/edit/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Failed to update history (${response.status})`,
      );
    }

    return (await response.json()) as {
      message: string;
      undo_empty: string;
      redo_empty: string;
    };
  } catch (error) {
    console.error('Failed to update history', error);
    throw error;
  }
};
