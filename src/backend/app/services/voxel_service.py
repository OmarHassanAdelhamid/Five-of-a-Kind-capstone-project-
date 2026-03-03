import trimesh.voxel.creation
import numpy as np

def voxelize(mesh, voxel_size: float):
    grid = mesh.voxelized(pitch=voxel_size).fill(method='base')
    return grid

def get_voxel_coordinates(grid):
    return grid.points

