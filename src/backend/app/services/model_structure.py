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

ALL_X_LAYERS= """
SELECT DISTINCT ix
FROM voxels v
ORDER BY ix;
"""

ALL_Y_LAYERS= """
SELECT DISTINCT iy
FROM voxels v
ORDER BY iy;
"""

ALL_Z_LAYERS= """
SELECT DISTINCT iz
FROM voxels v
ORDER BY iz;
"""


def find_surface(db_path: str) -> list[tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute(FIND_SURFACE)
        rows = db.cur.fetchall()
    return rows


def find_x_layer(iz: int, db_path: str) -> list[tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute(
        "SELECT x, y, z FROM voxels WHERE ix= ?;",
        (iz,)
    )
    layer_voxels = db.cur.fetchall()
    return layer_voxels

def find_y_layer(iz: int, db_path: str) -> list[tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute(
        "SELECT x, y, z FROM voxels WHERE iy = ?;",
        (iz,)
    )
    layer_voxels = db.cur.fetchall()
    return layer_voxels

def find_z_layer(iz: int, db_path: str) -> list[tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute(
        "SELECT x, y, z FROM voxels WHERE iz = ?;",
        (iz,)
    )
    layer_voxels = db.cur.fetchall()
    return layer_voxels


