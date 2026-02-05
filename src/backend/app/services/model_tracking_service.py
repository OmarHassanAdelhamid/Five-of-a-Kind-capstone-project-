import os
import numpy as np
from app.services.model_structure_service import VoxelDB     

FIND_SURFACE = """
SELECT v.ix, v.iy, v.iz
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

# Returns (index, coordinate_value) pairs for each distinct layer
ALL_X_LAYERS= """
SELECT DISTINCT ix, MIN(x) as x_coord
FROM voxels v
GROUP BY ix
ORDER BY ix;
"""

ALL_Y_LAYERS= """
SELECT DISTINCT iy, MIN(y) as y_coord
FROM voxels v
GROUP BY iy
ORDER BY iy;
"""

ALL_Z_LAYERS= """
SELECT DISTINCT iz, MIN(z) as z_coord
FROM voxels v
GROUP BY iz
ORDER BY iz;
"""

def find_surface(db_path: str) -> list[tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute(FIND_SURFACE)
        rows = db.cur.fetchall()
    return rows

def x_directory(db_path: str) -> list[tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute(ALL_X_LAYERS)
        rows = db.cur.fetchall()
    return rows

def y_directory(db_path: str) -> list[tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute(ALL_Y_LAYERS)
        rows = db.cur.fetchall()
    return rows

def z_directory(db_path: str) -> list[tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute(ALL_Z_LAYERS)
        rows = db.cur.fetchall()
    return rows

# get a list of all x layers based on their integer identifier
def get_x_layer(ix: int, db_path: str) -> list[tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute(
        "SELECT ix, iy, iz, x, y, z, magnetization, angle, material FROM voxels WHERE ix = ?;",
        (ix,))
        layer_voxels = db.cur.fetchall()
    return layer_voxels

# get a list of all y layers based on their integer identifier
def get_y_layer(iy: int, db_path: str) -> list[tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute(
        "SELECT ix, iy, iz, x, y, z, magnetization, angle, material FROM voxels WHERE iy = ?;",
        (iy,))
        layer_voxels = db.cur.fetchall()
    return layer_voxels

# get a list of all z layers based on their integer identifier
def get_z_layer(iz: int, db_path: str) -> list[tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute(
        "SELECT ix, iy, iz, x, y, z, magnetization, angle, material FROM voxels WHERE iz = ?;",
        (iz,))
        layer_voxels = db.cur.fetchall()
    return layer_voxels

