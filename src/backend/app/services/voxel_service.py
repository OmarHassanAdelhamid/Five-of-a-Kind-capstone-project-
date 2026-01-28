import trimesh.voxel.creation
import numpy as np


#target = max dimension from user (in mm)
#voxel_size --> size in mm

def voxelize(mesh, voxel_size: float):
    axis = "z"
    target = 5.0

    axis_to_col = {"x": 0, "y": 1, "z": 2}
    if axis not in axis_to_col:
        raise ValueError("axis must be 'x', 'y', or 'z'")
    if voxel_size <= 0:
        raise ValueError("voxel_size_mm must be > 0")
    if target <= 0:
        raise ValueError("target_mm must be > 0")
    
    num_voxels = int(np.round(target / voxel_size))
    num_voxels = max(num_voxels, 1)
    target_size = num_voxels * voxel_size

    current_extents = mesh.extents
    current_dim = float(current_extents[axis_to_col[axis]])
    scale = target_size / current_dim
    mesh.apply_scale(scale)

    grid = mesh.voxelized(pitch=voxel_size).fill(method='base')
    return grid

    
def scale_voxels(grid, scale_x: float, scale_y: float, scale_z: float):
    #NOT IMPLEMENTED!
    pass

def get_voxel_coordinates(grid):
    return grid.points

