import os
import numpy as np
from app.services.model_structure_service import VoxelDB
from typing import List, Tuple   

FIND_SURFACE = """
SELECT 
    v.x,
    v.y,
    v.z
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

def find_surface(db_path: str) -> List[Tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute(FIND_SURFACE)
        rows = db.cur.fetchall()
    return rows

def x_directory(db_path: str) -> List[Tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute(ALL_X_LAYERS)
        rows = db.cur.fetchall()
    return rows

def y_directory(db_path: str) -> List[Tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute(ALL_Y_LAYERS)
        rows = db.cur.fetchall()
    return rows

def z_directory(db_path: str) -> List[Tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute(ALL_Z_LAYERS)
        rows = db.cur.fetchall()
    return rows

def get_x_layer(ix: int, db_path: str) -> List[Tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute("""
            SELECT ix, iy, iz, x, y, z, material, magnet_polar, magnet_azimuth 
            FROM voxels 
            WHERE ix = ?;""",
            (ix,)
        )
        layer_voxels = db.cur.fetchall()
    return layer_voxels

def get_y_layer(iy: int, db_path: str) -> List[Tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute("""
            SELECT ix, iy, iz, x, y, z, material, magnet_polar, magnet_azimuth 
            FROM voxels 
            WHERE iy = ?;""",
            (iy,)
        )
        layer_voxels = db.cur.fetchall()
    return layer_voxels

def get_z_layer(iz: int, db_path: str) -> List[Tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute("""
            SELECT ix, iy, iz, x, y, z, material, magnet_polar, magnet_azimuth 
            FROM voxels 
            WHERE iz = ?;""",
            (iz,)
        )
        layer_voxels = db.cur.fetchall()
    return layer_voxels

def get_x_magnetized_voxels(ix: int, db_path: str) -> List[Tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute("""
            SELECT ix, iy, iz, x, y, z, material, magnet_polar, magnet_azimuth 
            FROM voxels 
            WHERE ix = ?
                AND WHERE magnet_polar != 0
                AND magnet_azimuth != 0;""",
            (ix,)
        )
        layer_voxels = db.cur.fetchall()
    return layer_voxels

def get_y_magnetized_voxels(iy: int, db_path: str) -> List[Tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute("""
            SELECT ix, iy, iz, x, y, z, material, magnet_polar, magnet_azimuth 
            FROM voxels 
            WHERE iy = ?
                AND WHERE magnet_polar != 0
                AND magnet_azimuth != 0;""",
            (iy,)
        )
        layer_voxels = db.cur.fetchall()
    return layer_voxels

def get_z_magnetized_voxels(iz: int, db_path: str) -> List[Tuple]:
    with VoxelDB(db_path) as db:
        db.cur.execute("""
            SELECT ix, iy, iz, x, y, z, material, magnet_polar, magnet_azimuth 
            FROM voxels 
            WHERE iz = ?
                AND WHERE magnet_polar != 0
                AND magnet_azimuth != 0;""",
            (iz,)
        )
        layer_voxels = db.cur.fetchall()
    return layer_voxels

def _parse_material_int(material_val) -> int:
    if isinstance(material_val, int):
        return material_val
    try:
        return int(material_val)
    except (ValueError, TypeError):
        pass
    if isinstance(material_val, str) and material_val.startswith('material'):
        try:
            return int(material_val[len('material'):])
        except ValueError:
            pass
    return 1


# get voxels with their properties given their integer identifiers
# returns (ix, iy, iz, material, magnet_polar, magnet_azimuth) tuples
def get_full_voxels(db_path: str, voxels: List[Tuple[int, int, int]]) -> List[Tuple]:
    with VoxelDB(db_path) as db:
        full_voxels = []
        for voxel in voxels:
            rows = db.get_properties(voxel[0], voxel[1], voxel[2])
            props = rows[0]
            # props: (material, magnet_magnitude, magnet_polar, magnet_azimuth)
            # _parse_material_int handles legacy DBs that stored material as 'material1' strings
            full_voxels.append((voxel[0], voxel[1], voxel[2], _parse_material_int(props[0]), props[2], props[3]))
    return full_voxels

