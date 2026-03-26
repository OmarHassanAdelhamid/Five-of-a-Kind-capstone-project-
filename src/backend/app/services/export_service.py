""""""

from typing import List, Tuple, IO

import os
import csv
from app.services.model_structure_service import VoxelDB


def write_csv(project_path: str, file_to_write: str) -> bool:
    """
    """
    with open(file_to_write, mode="w", newline="", encoding="utf-8") as file:
        partitions = [p for p in project_path.iterdir() if p.is_file()]
        all_voxels = []

        for partition_path in partitions:
            with VoxelDB(partition_path) as db:
                # retrieve all voxels from each partition and add them to the list of all voxels within the project.
                db.cur.execute("""
                    SELECT x, y, z, material, magnet_polar, magnet_azimuth
                    FROM voxels;"""
                )
                all_voxels.extend(db.cur.fetchall())
            
        if (_validate_voxels(all_voxels)):
            # write header + all voxels as rows to passed temp csv file.
            writer = csv.writer(file)
            writer.writerow(["x", "y", "z", "materialID", "magnet_polar", "magnet_azimuth"])
            writer.writerows(all_voxels)

            return True
        else:
            return False

def _validate_voxels(voxels: List[Tuple[float, float, float, int, float, float, float]]):
    """
    Validate that voxels to be written are correct.
    Since all voxels have default properties now, all this does is check that 
    the project is not empty; could be modified in the future to check against other things.
    """
    if (voxels != []): return True # cannot export empty project.
    else: return False