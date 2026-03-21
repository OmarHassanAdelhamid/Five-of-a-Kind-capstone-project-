import shutil
import os
from app.services.model_structure_service import VoxelDB    
from collections import deque


'''
get partitions, adjust integer coordinates to center the main structure, and note offset that is being used to centre structure
voxel_ref determines how partitions show be offset from the center 
'''
# adjust integer coordinates to center the main structure
def get_partitions(db_path: str, partition_size: int) -> list:
    partitions = []
    with VoxelDB(db_path) as db:
        db.cur.execute("""
            SELECT
                MIN(ix), MAX(ix),
                MIN(iy), MAX(iy),
                MIN(iz), MAX(iz)
            FROM voxels;
        """)
        min_ix, max_ix, min_iy, max_iy, min_iz, max_iz = db.cur.fetchone()

    base_dir = os.path.dirname(db_path)
    count = 1

    '''
    NOTE:
    if we would like to add padding around the structure as a safety net 
    for how many voxels can be added around the structure, adjust the lo and
    hi values, like below:
    x_lo = ((min_ix // partition_size) - ADDED VALUE) * partition_size
    '''
    x_lo = (min_ix // partition_size) * partition_size
    y_lo = (min_iy // partition_size) * partition_size
    z_lo = (min_iz // partition_size) * partition_size

    x_hi = ((max_ix // partition_size) + 1) * partition_size
    y_hi = ((max_iy // partition_size) + 1) * partition_size
    z_hi = ((max_iz // partition_size) + 1) * partition_size

    xcount = 0
    ycount = 0
    zcount = 0
    for i in range (x_lo, x_hi, partition_size):
        ycount = 0
        for j in range (y_lo, y_hi, partition_size):
            zcount = 0
            for k in range (z_lo, z_hi, partition_size):
                voxel_range = (i, i+partition_size, j, j+partition_size, k, k+partition_size)
                new_path = os.path.join(base_dir, f"partition-x-{xcount}-y-{ycount}-z-{zcount}.db")
                #new_path = os.path.join(base_dir, f"partition{count}.db")
                shutil.copy2(db_path, new_path)
                remove_outside_range(new_path, voxel_range)

                # keep only non-empty partitions
                with VoxelDB(new_path) as db:
                    db.cur.execute("SELECT 1 FROM voxels LIMIT 1;")
                    nonempty = db.cur.fetchone() is not None

                if nonempty:
                    partitions.append(new_path)
                    count += 1
                else:
                    os.remove(new_path)
                zcount += 1
            ycount += 1
        xcount += 1
    return partitions

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
