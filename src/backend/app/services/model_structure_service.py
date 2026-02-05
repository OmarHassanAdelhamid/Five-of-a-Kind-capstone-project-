import sqlite3
from typing import Iterable, Tuple, Any
import numpy as np

# likely will contains requirements of model_manager and model_structure

class VoxelDB:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.cur = self.conn.cursor()
        self._init_schema()

    def _init_schema(self) -> None:
        self.cur.execute("""
        CREATE TABLE IF NOT EXISTS voxels (
            ix INTEGER NOT NULL,
            iy INTEGER NOT NULL,
            iz INTEGER NOT NULL,
            x  REAL NOT NULL,
            y  REAL NOT NULL,
            z  REAL NOT NULL,
            material INTEGER NOT NULL DEFAULT 1,
            magnet_magnitude REAL NOT NULL DEFAULT 0.0,
            magnet_polar REAL NOT NULL DEFAULT 0.0,
            magnet_azimuth REAL NOT NULL DEFAULT 0.0,
            PRIMARY KEY (ix, iy, iz)
        );
        """)

        self.cur.execute("""
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        """)

        self.cur.execute("CREATE INDEX IF NOT EXISTS idx_voxels_iz ON voxels(iz);")
        self.conn.commit()
        
    # helpers to handle structure metadata 
    def set_meta(self, key: str, value: Any) -> None:
        self.cur.execute(
            "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", 
            (key, str(value))
        )

    def set_grid(self, origin: Tuple[float, float, float], voxel_size: float) -> None:
        ox, oy, oz = origin
        self.set_meta("origin_x", ox)
        self.set_meta("origin_y", oy)
        self.set_meta("origin_z", oz)
        self.set_meta("voxel_size", voxel_size)


    def get_meta(self, key: str) -> str | None:
        self.cur.execute(
            "SELECT value FROM meta WHERE key = ?",
            (key,)
        )
        row = self.cur.fetchone()
        return row[0] if row else None
    
    def get_grid_conversion(self, coordinates: np.array) -> Tuple[int, int, int]:
        ox = float(self.get_meta("origin_x"))
        oy = float(self.get_meta("origin_y"))
        oz = float(self.get_meta("origin_z"))
        voxel_size = float(self.get_meta("voxel_size"))

        ix = int(round((coordinates[0] - ox) / voxel_size))
        iy = int(round((coordinates[1] - oy) / voxel_size))
        iz = int(round((coordinates[2] - oz) / voxel_size))

        return (ix, iy, iz)

    # to intialize all voxels in the table
    def upsert_many(self, rows: Iterable[Tuple[int, int, int, float, float, float]]) -> None:
        self.cur.executemany("""
            INSERT OR REPLACE INTO voxels
            (ix, iy, iz, x, y, z)
            VALUES (?, ?, ?, ?, ?, ?)""", 
            list(rows)
        )
        
    # to add a single voxel
    def add_voxel(self, ix: int, iy: int, iz: int) -> None:
        # TODO: how to set x, y, z properly!

        self.cur.execute("""
            INSERT OR REPLACE INTO voxels
            (ix, iy, iz, x, y, z)
            VALUES (?, ?, ?, ?, ?, ?)""", 
            (ix, iy, iz, x, y, z)
        )
        
    # to remove a single voxel
    def delete_voxel(self, ix: int, iy: int, iz: int) -> None:
        self.cur.execute("""
            DELETE FROM voxels 
            WHERE ix = ? AND iy = ? AND iz = ?""",
            (ix, iy, iz)
        )   

    # to set a specific magnetization (and angle) value for a voxel
    def set_magnetization(self, ix: int, iy: int, iz: int, magnet_mag: float, mag_polar: float, mag_azi: float) -> None:
        self.cur.execute("""
            UPDATE voxels
            SET magnet_magnitude = ?, magnet_polar = ?, magnet_azimuth = ?
            WHERE ix = ? AND iy = ? AND iz = ?""", 
            (magnet_mag, mag_polar, mag_azi, ix, iy, iz)
        ) 

    def set_material(self, ix: int, iy: int, iz: int, material_val: int) -> None:
        self.cur.execute("""
            UPDATE voxels
            SET material = ?
            WHERE ix = ? AND iy = ? AND iz = ?""", 
            (material_val, ix, iy, iz)
        )

    def get_properties(self, ix: int, iy: int, iz: int) -> Tuple[int, float, float, float]:
        self.cur.execute("""
            SELECT material, magnet_magnitude, magnet_polar, magnet_azimuth
            FROM voxels
            WHERE ix = ? AND iy = ? AND iz = ?""",
            (ix, iy, iz)
        )
        return self.cur.fetchall()
    
    def set_properties(self, ix: int, iy: int, iz: int, material_val: int, magnet_mag: float, mag_polar: float, mag_azi: float) -> None:
        self.cur.execute("""
            UPDATE voxels
            SET material = ?, magnet_magnitude = ?, magnet_polar = ?, magnet_azimuth = ?
            WHERE ix = ? AND iy = ? AND iz = ?""",
            (material_val, magnet_mag, mag_polar, mag_azi, ix, iy, iz)
        )

    
    # additional helpers
    def commit(self) -> None: # closes database, but file still exists
        self.conn.commit()

    def close(self) -> None: # commits changes, closes the SQLite connection, releases file locks
        self.conn.commit()
        self.conn.close()

    def __enter__(self) -> "VoxelDB": # when entering the with block, give me the open database object.
        return self

    def __exit__(self, exc_type, exc, tb) -> None: # runs automatically when the with block ends
        self.close()
