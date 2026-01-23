import os
import numpy as np
from .model_manager import VoxelDB

FIND_SURFACE = """
SELECT v.x, v.y, v.z
FROM voxels v
LEFT JOIN voxels xp ON xp.ix = v.ix + 1 AND xp.iy = v.iy     AND xp.iz = v.iz
LEFT JOIN voxels xm ON xm.ix = v.ix - 1 AND xm.iy = v.iy     AND xm.iz = v.iz
LEFT JOIN voxels yp ON yp.ix = v.ix     AND yp.iy = v.iy + 1 AND yp.iz = v.iz
LEFT JOIN voxels ym ON ym.ix = v.ix     AND ym.iy = v.iy - 1 AND ym.iz = v.iz
LEFT JOIN voxels zp ON zp.ix = v.ix     AND zp.iy = v.iy     AND zp.iz = v.iz + 1
LEFT JOIN voxels zm ON zm.ix = v.ix     AND zm.iy = v.iy     AND zm.iz = v.iz - 1
WHERE xp.ix IS NULL
   OR xm.ix IS NULL
   OR yp.ix IS NULL
   OR ym.ix IS NULL
   OR zp.ix IS NULL
   OR zm.ix IS NULL;
"""

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

def read_surface_db(db_path: str) -> np.ndarray:
    with VoxelDB(db_path) as db:
        db.cur.execute(FIND_SURFACE)
        rows = db.cur.fetchall()

    return np.array(rows, dtype=float) if rows else np.empty((0, 3), dtype=float)

