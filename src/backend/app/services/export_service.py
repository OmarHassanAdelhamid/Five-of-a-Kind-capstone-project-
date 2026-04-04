""""""

from typing import List, Tuple, IO
from pathlib import Path

import os
import csv
from app.services.model_structure_service import VoxelDB


def _collect_voxels(project_path: Path) -> List[Tuple[float, float, float, int, float, float]]:
    """Reads all voxels from every partition under project_path."""
    partitions = [p for p in project_path.iterdir() if p.is_file()]
    all_voxels = []
    for partition_path in partitions:
        with VoxelDB(partition_path) as db:
            db.cur.execute(
                "SELECT x, y, z, material, magnet_polar, magnet_azimuth FROM voxels;"
            )
            all_voxels.extend(db.cur.fetchall())
    return all_voxels


def get_validation_warnings(project_path: Path) -> List[str]:
    """
    Returns a list of human-readable warning strings for issues that would
    normally block export but can be overridden by the user.

    An empty list means the project is fully valid.
    Raises ValueError if the project has no voxels at all (non-overridable).
    """
    all_voxels = _collect_voxels(project_path)

    if not all_voxels:
        raise ValueError("Project contains no voxels.")

    warnings: List[str] = []

    if any(voxel[3] == 0 for voxel in all_voxels):
        warnings.append("One or more voxels have no material assigned.")

    if all(voxel[4] == 0.0 and voxel[5] == 0.0 for voxel in all_voxels):
        warnings.append("No voxels have magnetization assigned.")

    return warnings


def write_csv(project_path: Path, file_to_write: str, force: bool = False) -> bool:
    """
    Writes the project voxels to a CSV file.

    If force=False (default) the standard validation is applied and False is
    returned when the project fails validation.  If force=True the CSV is
    written regardless of validation warnings (empty-project is still an error).
    """
    all_voxels = _collect_voxels(project_path)

    if not all_voxels:
        return False

    if not force:
        if any(voxel[3] == 0 for voxel in all_voxels):
            return False
        if all(voxel[4] == 0.0 and voxel[5] == 0.0 for voxel in all_voxels):
            return False

    with open(file_to_write, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["x", "y", "z", "materialID", "magnet_polar", "magnet_azimuth"])
        writer.writerows(all_voxels)

    return True


def _validate_voxels(voxels: List[Tuple[float, float, float, int, float, float]]) -> bool:
    """
    Validate that voxels are complete and ready for export.
    Returns False if:
      - The project has no voxels.
      - Any voxel has material == 0 (unassigned).
      - Any voxel has both magnet_polar == 0 and magnet_azimuth == 0 (magnetization not set).
    """
    if voxels == []:
        return False
    for voxel in voxels:
        if voxel[3] == 0:
            return False
    if all(voxel[4] == 0.0 and voxel[5] == 0.0 for voxel in voxels):
        return False
    return True