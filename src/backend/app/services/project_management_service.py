import os
from typing import Tuple
import numpy as np
from app.services.model_structure_service import VoxelDB
import app.services.partition_manager as pm


def initialize_voxel_db(project_path: str, origin: np.ndarray, voxel_size: float, 
                        default_material: int, default_magnetization: Tuple[float, float, float])-> None:
    ox, oy, oz = origin
    with VoxelDB(project_path) as db:
        # initialize defaults, set grid + voxel size metadata.
        db.init_schema(default_material, default_magnetization)
        db.set_grid((float(ox), float(oy), float(oz)), float(voxel_size))
        db.commit() 

def create_voxel_db(project_path: str, coordinates: np.array):
    rows = []
    for coord in coordinates:
        with VoxelDB(project_path) as db:
            idx = db.get_grid_conversion(coord)
            rows.append((
            idx[0], idx[1], idx[2],
            float(coord[0]), float(coord[1]), float(coord[2]),
        ))

    with VoxelDB(project_path) as db:
        db.upsert_many(rows)
        db.centre_structure()
        db.commit() 
    '''
    Note: get_partitions should only be called if the total number of voxels in
    a db is > some maximum value. will need to be experimentally determined.

    Alternatively, could be done within partition_manager itself; if it detects #voxels
    is small, it only makes one db / leaves it untouched.
    '''
    pm.get_partitions(project_path, 11) 

def read_voxels(rows: list[tuple]) -> np.ndarray:
    return np.array(rows, dtype=float) if rows else np.empty((0, 3), dtype=float)

