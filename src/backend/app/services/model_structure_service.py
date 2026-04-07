import sqlite3
from typing import Iterable, Tuple, Any
import numpy as np

# likely will contains requirements of model_manager and model_structure

class VoxelDB:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.cur = self.conn.cursor()

    def init_schema(self, default_material: int, default_magnetization: Tuple[float, float, float]) -> None:
        d_mm, d_mp, d_ma = default_magnetization
        self.cur.execute(f"""
        CREATE TABLE IF NOT EXISTS voxels (
            ix INTEGER NOT NULL,
            iy INTEGER NOT NULL,
            iz INTEGER NOT NULL,
            x  REAL NOT NULL,
            y  REAL NOT NULL,
            z  REAL NOT NULL,
            cx INTEGER NOT NULL DEFAULT 0,
            cy INTEGER NOT NULL DEFAULT 0,
            cz INTEGER NOT NULL DEFAULT 0,
            material INTEGER NOT NULL DEFAULT {default_material},
            magnet_magnitude REAL NOT NULL DEFAULT {d_mm},
            magnet_polar REAL NOT NULL DEFAULT {d_mp},
            magnet_azimuth REAL NOT NULL DEFAULT {d_ma},
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
        self._migrate_magnetization_columns() # for legacy dbs.
        self._migrate_material_values()       # for legacy dbs with string material IDs.
        self.set_meta("default_material", str(default_material))
        self.set_meta("default_magnet_magnitude", str(d_mm))
        self.set_meta("default_magnet_polar", str(d_mp))
        self.set_meta("default_magnet_azimuth", str(d_ma))
        self.conn.commit()

    def _migrate_magnetization_columns(self) -> None:
        """Add magnetization columns to existing databases that lack them."""
        self.cur.execute("PRAGMA table_info(voxels)")
        columns = {row[1] for row in self.cur.fetchall()}
        if "magnet_magnitude" not in columns:
            self.cur.execute(
                "ALTER TABLE voxels ADD COLUMN magnet_magnitude REAL NOT NULL DEFAULT 0.0"
            )
        if "magnet_polar" not in columns:
            self.cur.execute(
                "ALTER TABLE voxels ADD COLUMN magnet_polar REAL NOT NULL DEFAULT 0.0"
            )
        if "magnet_azimuth" not in columns:
            self.cur.execute(
                "ALTER TABLE voxels ADD COLUMN magnet_azimuth REAL NOT NULL DEFAULT 0.0"
            )
        
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
    

    # shift ix, iy, iz to center structure
    def centre_structure(self) -> None:

        # queries to find the centered of the span for an offset that will properly center the structure
        self.cur.execute("""
            SELECT
                (MAX(ix) + MIN(ix)) / 2,
                (MAX(iy) + MIN(iy)) / 2,
                (MAX(iz) + MIN(iz)) / 2
            FROM voxels;
        """)
        cx, cy, cz = self.cur.fetchone()

        # shift all voxel coordinates to center the structure
        self.cur.execute("""
            UPDATE voxels
            SET
                ix = ix - ?,
                iy = iy - ?,
                iz = iz - ?;
        """, (round(cx), round(cy), round(cz)))

    # to intialize all voxels in the table
    def upsert_many(self, rows: Iterable[Tuple[int, int, int, float, float, float]]) -> None:
        self.cur.executemany("""
            INSERT OR REPLACE INTO voxels
            (ix, iy, iz, x, y, z)
            VALUES (?, ?, ?, ?, ?, ?)""", 
            list(rows)
        )

    def apply_default_material_to_all_voxels(self) -> None:
        """Set every voxel's material to the project default."""
        raw = self.get_meta("default_material")
        if raw is None:
            raw = self._get_default_property("material")
        if raw is None:
            return
        dm = self._parse_material_int(raw)
        self.cur.execute("UPDATE voxels SET material = ?", (dm,))
        
    # to add a single voxel
    def add_voxel(self, ix: int, iy: int, iz: int) -> None:
        voxel_size = float(self.get_meta("voxel_size") or 0.1)
        self.cur.execute(
            "SELECT ix, iy, iz, x, y, z FROM voxels LIMIT 1"
        )
        row = self.cur.fetchone()
        if row is not None:
            (ix0, iy0, iz0, x0, y0, z0) = row
            ox = float(x0) - ix0 * voxel_size
            oy = float(y0) - iy0 * voxel_size
            oz = float(z0) - iz0 * voxel_size
        else:
            ox = float(self.get_meta("origin_x") or 0)
            oy = float(self.get_meta("origin_y") or 0)
            oz = float(self.get_meta("origin_z") or 0)

        x = ix * voxel_size + ox
        y = iy * voxel_size + oy
        z = iz * voxel_size + oz

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

    def set_material_label(self, material_id: int, label: str) -> None:
        """Associate a human-readable label with a material ID, stored in the meta table."""
        self.set_meta(f"material_label_{material_id}", label)

    def get_material_label(self, material_id: int) -> str | None:
        """Retrieve the label associated with a material ID, or None if not set."""
        return self.get_meta(f"material_label_{material_id}")

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
        properties = self.cur.fetchall()
        if properties == []: raise ValueError("Properties requested of non-existent voxel.")
        else: return properties
    
    def set_properties(self, ix: int, iy: int, iz: int, material_val: int, magnet_mag: float, mag_polar: float, mag_azi: float) -> None:
        self.cur.execute("""
            UPDATE voxels
            SET material = ?, magnet_magnitude = ?, magnet_polar = ?, magnet_azimuth = ?
            WHERE ix = ? AND iy = ? AND iz = ?""",
            (material_val, magnet_mag, mag_polar, mag_azi, ix, iy, iz)
        )

    def reset_material(self, ix: int, iy: int, iz: int) -> None:
        raw = self._get_default_property("material")
        material_default = self._parse_material_int(raw)
        self.cur.execute("""
            UPDATE voxels
            SET material = ?
            WHERE ix = ? AND iy = ? AND iz = ?""",
            (material_default, ix, iy, iz)
        )

    def reset_magnetization(self, ix: int, iy: int, iz: int) -> None:
        self.cur.execute("""
            UPDATE voxels
            SET magnet_magnitude = ?, magnet_polar = ?, magnet_azimuth = ?
            WHERE ix = ? AND iy = ? AND iz = ?""",
            (self._get_default_property("magnet_magnitude"), 
             self._get_default_property("magnet_polar"), 
             self._get_default_property("magnet_azimuth"),  ix, iy, iz)
        )

    # additional helpers
    @staticmethod
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

    def _migrate_material_values(self) -> None:
        self.cur.execute("SELECT DISTINCT material FROM voxels WHERE typeof(material) = 'text'")
        legacy = self.cur.fetchall()
        for (mat_str,) in legacy:
            mat_int = self._parse_material_int(mat_str)
            self.cur.execute(
                "UPDATE voxels SET material = ? WHERE material = ?",
                (mat_int, mat_str),
            )

    def _get_default_property(self, property_name: str):
        meta_key = {
            "material": "default_material",
            "magnet_magnitude": "default_magnet_magnitude",
            "magnet_polar": "default_magnet_polar",
            "magnet_azimuth": "default_magnet_azimuth",
        }.get(property_name)
        if meta_key is not None:
            v = self.get_meta(meta_key)
            if v is not None:
                return v
        self.cur.execute("PRAGMA table_info(voxels)")
        for col in self.cur.fetchall():
            if col[1] == property_name:
                return col[4] 
        return None

    def commit(self) -> None: # closes database, but file still exists
        self.conn.commit()

    def close(self) -> None: # commits changes, closes the SQLite connection, releases file locks
        self.conn.commit()
        self.conn.close()

    def __enter__(self) -> "VoxelDB": # when entering the with block, give me the open database object.
        return self

    def __exit__(self, exc_type, exc, tb) -> None: # runs automatically when the with block ends
        self.close()
