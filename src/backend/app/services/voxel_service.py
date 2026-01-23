import trimesh.voxel.creation

def voxelize(mesh, voxel_size: float):
    grid = mesh.voxelized(pitch=voxel_size).fill(method='base')
    return grid

def scale_voxels(grid, scale_x: float, scale_y: float, scale_z: float):
    #NOT IMPLEMENTED!
    pass

def get_voxel_coordinates(grid):
    return grid.points

