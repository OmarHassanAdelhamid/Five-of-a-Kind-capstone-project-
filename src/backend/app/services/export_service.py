""""""

from typing import List, Tuple, IO

import os
import csv
from app.services.model_structure_service import VoxelDB

# ! will need to be modified to work with partitions
def write_csv(project_path: str, file_to_write: str) -> bool:
    """
    """
    with open(file_to_write, mode="w", newline="", encoding="utf-8") as file:
        with VoxelDB(project_path) as db:
            # retrieve all voxels.
            db.cur.execute("""
                SELECT x, y, z, material, magnet_magnitude, magnet_polar, magnet_azimuth
                FROM voxels;"""
            )
            all_voxels = db.cur.fetchall()
        
            if (_validate_voxels(all_voxels)):
                # write header + all voxels as rows to passed temp csv file.
                writer = csv.writer(file)
                writer.writerow(["x", "y", "z", "materialID", "magnet_magnitude", "magnet_polar", "magnet_azimuth"])
                writer.writerows(all_voxels)

                return True
            else:
                return False

# TODO: complete.
def _validate_voxels(voxels: List[Tuple[float, float, float, int, float, float, float]]):
    """
    """
    return True
