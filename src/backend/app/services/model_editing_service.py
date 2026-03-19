
from typing import List, Tuple
from app.services.model_structure_service import VoxelDB


def update_voxel_materials(db_path: str, voxels: List[Tuple[int, int, int]], materialID: int):
    if materialID < 1: raise ValueError("materialID must be 1 or greater.")
    with VoxelDB(db_path) as db:
        for voxel in voxels:
            db.set_material(voxel[0], voxel[1], voxel[2], materialID)

def update_voxel_magnetization(db_path: str, voxels: List[Tuple[int, int, int]], polar: float, azimuth: float):
    if polar < 0 or polar > 180: raise ValueError("Polar coordinate must be in range (0, 180)")
    if azimuth < 0 or azimuth > 360: raise ValueError("Azimuth angle must be in range (0, 360)") 
    with VoxelDB(db_path) as db:
        for voxel in voxels:
            db.set_magnetization(voxel[0], voxel[1], voxel[2], 1.0, polar, azimuth)
        
def update_voxel_properties(db_path: str, voxels: List[Tuple[int, int, int, int, float, float]]):
    """Update voxel properties from (ix, iy, iz, material, magnet_polar, magnet_azimuth) tuples."""
    with VoxelDB(db_path) as db:
        for voxel in voxels:
            if voxel[3] < 1: raise ValueError("materialID must be 1 or greater.")
            if voxel[4] < 0 or voxel[4] > 180: raise ValueError("Polar coordinate must be in range (0, 180)")
            if voxel[5] < 0 or voxel[5] > 360: raise ValueError("Azimuth angle must be in range (0, 360)")
            db.set_properties(voxel[0], voxel[1], voxel[2], voxel[3], 1.0, voxel[4], voxel[5])

def add_voxels(db_path: str, voxels: List[Tuple[int, int, int]]):
    with VoxelDB(db_path) as db:
        for voxel in voxels:
            db.add_voxel(voxel[0], voxel[1], voxel[2])

def delete_voxels(db_path: str, voxels: List[Tuple[int, int, int]]):
    with VoxelDB(db_path) as db:
        for voxel in voxels:
            db.delete_voxel(voxel[0], voxel[1], voxel[2])

def reset_voxel_materials(db_path: str, voxels: List[Tuple[int, int, int]]):
    with VoxelDB(db_path) as db:
        for voxel in voxels:
            db.reset_material(voxel[0], voxel[1], voxel[2])

def reset_voxel_magnetizations(db_path: str, voxels: List[Tuple[int, int, int]]):
    with VoxelDB(db_path) as db:
        for voxel in voxels:
            db.reset_magnetization(voxel[0], voxel[1], voxel[2])

