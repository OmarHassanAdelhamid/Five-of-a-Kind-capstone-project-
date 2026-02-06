import shutil
import os
from app.services.model_structure_service import VoxelDB    
from collections import deque

PARTITIONS: list[str] = []

'''
get partitions, adjust integer coordinates to center the main structure, and note offset that is being used to centre structure
voxel_ref determines how partitions show be offset from the center 
'''
# adjust integer coordinates to center the main structure
def get_partitions(db_path: str, partition_size: int) -> None:
    PARTITIONS.clear()
    with VoxelDB(db_path) as db:
        db.cur.execute("""
            SELECT
                MIN(ix), MAX(ix),
                MIN(iy), MAX(iy),
                MIN(iz), MAX(iz)
            FROM voxels;
        """)
        min_ix, max_ix, min_iy, max_iy, min_iz, max_iz = db.cur.fetchone()

    print("ix:", min_ix, max_ix, "span:", max_ix - min_ix)
    print("iy:", min_iy, max_iy, "span:", max_iy - min_iy)
    print("iz:", min_iz, max_iz, "span:", max_iz - min_iz)


    base_dir = os.path.dirname(db_path)
    count = 1

    half = partition_size//2

    '''
    NOTE:
    if we would liek to add padding around the structure as a safety net 
    for how many voxels can be added around the structure, adjust the lo and
    hi values, like below:
    x_lo = ((min_ix // half) - ADDED VALUE) * half
    '''
    x_lo = (min_ix // half) * half
    y_lo = (min_iy // half) * half
    z_lo = (min_iz // half) * half
    x_hi = ((max_ix // half) + 1) * half
    y_hi = ((max_iy // half) + 1) * half
    z_hi = ((max_iz // half) + 1) * half

    print("lwo & high:", x_lo, x_hi)
    print("lwo & high:", y_lo, y_hi)
    print("lwo & high:", z_lo, z_hi)

    for i in range (x_lo, x_hi, partition_size):
        for j in range (y_lo, y_hi, partition_size):
            for k in range (z_lo, z_hi, partition_size):
                voxel_range = (i, i+partition_size, j, j+partition_size, k, k+partition_size)
                #new_path = os.path.join(base_dir, f"partition_{count}.db")
                new_path = os.path.join(base_dir, f"sphere-partition{count}.db")
                shutil.copy2(db_path, new_path)
                remove_outside_range(new_path, voxel_range)

                # keep only non-empty partitions
                with VoxelDB(new_path) as db:
                    db.cur.execute("SELECT 1 FROM voxels LIMIT 1;")
                    nonempty = db.cur.fetchone() is not None

                if nonempty:
                    PARTITIONS.append(new_path)
                    count += 1
                else:
                    os.remove(new_path)

# query to remove parts of the sql table that are not part of the specific partition
def remove_outside_range(path: str, voxel_range: tuple[int, int, int, int, int, int]) -> None:
    xmin, xmax, ymin, ymax, zmin, zmax = voxel_range

    with VoxelDB(path) as db:
        db.cur.execute(
            """
            DELETE FROM voxels
            WHERE NOT (
                ix >= ? AND ix < ?
                AND iy >= ? AND iy < ?
                AND iz >= ? AND iz < ?
            );
            """,
            (xmin, xmax, ymin, ymax, zmin, zmax),
        )
        db.commit()
