import os
import numpy as np
from .model_manager import VoxelDB

def create_voxel_db(coordinates: np.array, filename: str, path: str, origin: np.ndarray, voxel_size)-> str:
    project_path = os.path.join(path, filename) 
    ox, oy, oz = origin

    rows = []
    for x, y, z in coordinates:
        ix = round((x - ox) / voxel_size)
        iy = round((y - oy) / voxel_size)
        iz = round((z - oz) / voxel_size)

        rows.append((
            int(ix), int(iy), int(iz),
            float(x), float(y), float(z),
        ))

    with VoxelDB(project_path) as db:
        db.set_grid((float(ox), float(oy), float(oz)), float(voxel_size))
        db.upsert_many(rows)
        db.commit() 

    return project_path

def read_xyz(rows: list[tuple]) -> np.ndarray:
    return np.array(rows, dtype=float) if rows else np.empty((0, 3), dtype=float)

