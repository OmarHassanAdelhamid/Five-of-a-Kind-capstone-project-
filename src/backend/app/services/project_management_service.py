import os
import numpy as np
from app.services.model_structure_service import VoxelDB
import app.services.partition_manager as pm


def initialize_voxel_db(project_path: str, origin: np.ndarray, voxel_size: float)-> None:
    ox, oy, oz = origin
    with VoxelDB(project_path) as db:
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
    pm.get_partitions(project_path, 6)

def read_voxels(rows: list[tuple]) -> np.ndarray:
    return np.array(rows, dtype=float) if rows else np.empty((0, 3), dtype=float)

