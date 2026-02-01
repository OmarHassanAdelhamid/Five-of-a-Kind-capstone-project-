import { API_BASE_URL } from './constants'

export interface VoxelizedData {
  project_name?: string
  coordinates?: number[][]
  num_voxels?: number
}

export const fetchAvailableModels = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/models/list-stl`)
    if (!response.ok) {
      throw new Error(`Failed to fetch models (${response.status})`)
    }

    const modelList = (await response.json()) as string[]
    const filtered = modelList.filter((name) => name.toLowerCase().endsWith('.stl'))
    return filtered
  } catch (error) {
    console.error('Failed to fetch STL models', error)
    throw error
  }
}

export const fetchAvailableProjects = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/voxelize/list`)
    if (!response.ok) {
      throw new Error(`Failed to fetch projects (${response.status})`)
    }

    const data = (await response.json()) as { projects?: string[] }
    return data.projects ?? []
  } catch (error) {
    console.error('Failed to fetch available projects', error)
    return []
  }
}

export const fetchVoxelized = async (project: string): Promise<number[][]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/voxelize/?project_name=${encodeURIComponent(project)}`)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to fetch voxelized data (${response.status})`)
    }

    const data = (await response.json()) as VoxelizedData

    if (data.coordinates) {
      return data.coordinates
    }
    return []
  } catch (error) {
    console.error('Failed to fetch voxelized coordinates', error)
    throw error
  }
}

export const uploadSTLFile = async (file: File): Promise<{ message?: string }> => {
  const formData = new FormData()
  formData.append('stl_file', file)

  const response = await fetch(`${API_BASE_URL}/api/upload-stl`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Upload failed')
  }

  return (await response.json()) as { message?: string }
}

export interface VoxelizeRequest {
  stl_filename: string
  voxel_size: number
  project_name: string
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
  }

  const response = await fetch(`${API_BASE_URL}/api/voxelize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.detail || errorData.message || 'Voxelization failed')
  }

  return (await response.json()) as { message?: string; projectpath?: string }
}

export const downloadVoxelCSV = async (projectName: string): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/api/voxelize/download/${encodeURIComponent(projectName)}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to download CSV (${response.status})`)
  }

  return await response.blob()
}

export interface LayerInfo {
  layer_value: number
  num_voxels: number
}

export interface LayersResponse {
  project_name: string
  num_layers: number
  layers: LayerInfo[]
  axis?: 'z' | 'x' | 'y'
}

export const fetchLayers = async (
  projectName: string,
  voxelSize?: number,
  axis?: 'z' | 'x' | 'y',
): Promise<LayersResponse> => {
  try {
    const url = new URL(`${API_BASE_URL}/api/layers/${encodeURIComponent(projectName)}`)
    if (voxelSize !== undefined) {
      url.searchParams.set('voxel_size', voxelSize.toString())
    }
    if (axis !== undefined) {
      url.searchParams.set('axis', axis)
    }

    const response = await fetch(url.toString())
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to fetch layers (${response.status})`)
    }

    return (await response.json()) as LayersResponse
  } catch (error) {
    console.error('Failed to fetch layers', error)
    throw error
  }
}

export interface LayerVoxel {
  x: number
  y: number
  z: number
  magnetization: number
  angle: number
  material: number
  grid_x: number
  grid_y: number
}

export interface LayerBounds {
  grid_x_min: number
  grid_x_max: number
  grid_y_min: number
  grid_y_max: number
}

export interface LayerResponse {
  project_name: string
  layer_value: number
  num_voxels: number
  voxels: LayerVoxel[]
  axis?: 'z' | 'x' | 'y'
  bounds?: LayerBounds
  in_plane_axes?: string[]
}

export const fetchLayer = async (
  projectName: string,
  layerValue: number,
  voxelSize?: number,
  axis?: 'z' | 'x' | 'y',
): Promise<LayerResponse> => {
  try {
    const url = new URL(
      `${API_BASE_URL}/api/layers/${encodeURIComponent(projectName)}/${layerValue}`,
    )
    if (voxelSize !== undefined) {
      url.searchParams.set('voxel_size', voxelSize.toString())
    }
    if (axis !== undefined) {
      url.searchParams.set('axis', axis)
    }

    const response = await fetch(url.toString())
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to fetch layer (${response.status})`)
    }

    return (await response.json()) as LayerResponse
  } catch (error) {
    console.error('Failed to fetch layer', error)
    throw error
  }
}

export interface UpdateLayerRequest {
  project_name: string
  layer_value: number
  voxels: number[][] // [x, y, z, magnetization, angle, ID]
  voxel_size?: number
  axis?: 'z' | 'x' | 'y'
}

export const updateLayer = async (
  request: UpdateLayerRequest,
): Promise<{ message: string; project_name: string; num_voxels: number }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/layers/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to update layer (${response.status})`)
    }

    return (await response.json()) as {
      message: string
      project_name: string
      num_voxels: number
    }
  } catch (error) {
    console.error('Failed to update layer', error)
    throw error
  }
}

