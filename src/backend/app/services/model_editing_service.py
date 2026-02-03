
from typing import List, Tuple
from app.services.model_structure_service import VoxelDB


def update_voxel_materials(db_path: str, voxels: List[Tuple[int, int, int]], materialID: int):
    with VoxelDB(db_path) as db:
        for voxel in voxels:
            db.set_material(voxel[0], voxel[1], voxel[2], materialID)

def update_voxel_magnetization(db_path: str, voxels: List[Tuple[int, int, int]], magnetization: Tuple[float, float, float]):
     with VoxelDB(db_path) as db:
        for voxel in voxels:
            db.set_magnetization(voxel[0], voxel[1], voxel[2], 
                                 magnetization[0], magnetization[1], magnetization[2])

def add_voxels(db_path: str, voxels: List[Tuple[int, int, int]]):
    with VoxelDB(db_path) as db:
        for voxel in voxels:
            db.add_voxel(voxel[0], voxel[1], voxel[2])

def delete_voxels(db_path: str, voxels: List[Tuple[int, int, int]]):
    with VoxelDB(db_path) as db:
        for voxel in voxels:
            db.delete_voxel(voxel[0], voxel[1], voxel[2])

