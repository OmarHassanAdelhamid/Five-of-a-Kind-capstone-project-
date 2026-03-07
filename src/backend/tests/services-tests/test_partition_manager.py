import pytest
import sqlite3
import os
from pathlib import Path
import app.services.partition_manager as pm

TEST_VOXELS = [(0, 0, 0, 0.0, 0.0, 0.0),
               (1, 1, 1, 1.0, 1.0, 1.0),
               (2, 2, 2, 2.0, 2.0, 2.0),
               (3, 3, 3, 3.0, 3.0, 3.0),
               (4, 4, 4, 4.0, 4.0, 4.0),
               (5, 5, 5, 5.0, 5.0, 5.0)]
TEST_PATH = (Path(__file__).parent.parent / "test-files").resolve()
TEST_FILE = "test_partition_manager.db"

def make_test_database(path: str, test_voxels: list[tuple[int, int, int, float, float, float]]):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS voxels (
            ix INTEGER NOT NULL,
            iy INTEGER NOT NULL,
            iz INTEGER NOT NULL,
            x REAL NOT NULL,
            y REAL NOT NULL,
            z REAL NOT NULL,
            PRIMARY KEY (ix, iy, iz)
        );
    """)

    cur.executemany("""
        INSERT INTO voxels (ix, iy, iz, x, y, z)
        VALUES (?, ?, ?, ?, ?, ?)
    """, test_voxels)

    conn.commit()
    conn.close()

def fetch_test_voxels(path: str) -> list[tuple]:
    conn = sqlite3.connect(path)
    cur = conn.cursor()

    cur.execute("""
        SELECT ix, iy, iz, x, y, z
        FROM voxels
    """)
    rows = cur.fetchall()
    conn.close()
    return rows

def test_all_within_valid_range() -> None:
    """Check that all voxels are preserved if all fall within the range."""

    filepath = TEST_PATH / TEST_FILE
    if filepath.exists(): filepath.unlink()
    assert filepath.exists() == False 
    
    make_test_database(filepath, TEST_VOXELS)
    pm.remove_outside_range(filepath, (0, 6, 0, 6, 0, 6))
    rows = fetch_test_voxels(filepath)
    assert rows == TEST_VOXELS

def test_valid_range() -> None:
    """Check that only voxels within a specific range of a single number in all directions (x, y, z) are preserved."""

    filepath = TEST_PATH / TEST_FILE
    if filepath.exists(): filepath.unlink()
    assert filepath.exists() == False 
    
    make_test_database(filepath, TEST_VOXELS)
    pm.remove_outside_range(filepath, (3, 4, 3, 4, 3, 4))
    rows = fetch_test_voxels(filepath)
    assert rows == [(3, 3, 3, 3.0, 3.0, 3.0)]

def test_nonexistent_range() -> None:
    """Check that no voxels are preserved when there is no range (difference btwn min and max > 1)."""

    filepath = TEST_PATH / TEST_FILE
    if filepath.exists(): filepath.unlink()
    assert filepath.exists() == False 
    
    make_test_database(filepath, TEST_VOXELS)
    pm.remove_outside_range(filepath, (1, 1, 1, 1, 1, 1))
    rows = fetch_test_voxels(filepath)
    assert rows == []

def test_invalid_range() -> None:
    """Check that no voxels are preserved when an invalid range in given."""

    filepath = TEST_PATH / TEST_FILE
    if filepath.exists(): filepath.unlink()
    assert filepath.exists() == False 
    
    make_test_database(filepath, TEST_VOXELS)
    pm.remove_outside_range(filepath, (4, -3, 4, -3, 4, -3))
    rows = fetch_test_voxels(filepath)
    assert rows == []

def test_list_single_partition() -> None:
    """Check that a single partition is generated when the size of the structure can be contained within the designated partition size."""

    filepath = TEST_PATH / TEST_FILE
    if filepath.exists(): filepath.unlink()
    assert filepath.exists() == False 

    make_test_database(filepath, TEST_VOXELS)
    partitions = pm.get_partitions(filepath, 6)
    base_dir = os.path.dirname(filepath)
    new_path = os.path.join(base_dir, f"partition1.db")
    assert partitions == [new_path]

def test_generated_single_partition() -> None:
    """Check that all voxels are within the partition"""

    filepath = TEST_PATH / TEST_FILE
    if filepath.exists(): filepath.unlink()
    assert filepath.exists() == False 

    make_test_database(filepath, TEST_VOXELS)
    partitions = pm.get_partitions(filepath, 6)
    base_dir = os.path.dirname(filepath)
    new_path = os.path.join(base_dir, f"partition1.db")
    rows = fetch_test_voxels(new_path)
    assert rows == TEST_VOXELS


def test_list_of_multiple_partitions() -> None:
    """Check that all voxels are within the partition"""

    filepath = TEST_PATH / TEST_FILE
    if filepath.exists(): filepath.unlink()
    for file in TEST_PATH.iterdir():
        if file.is_file():
            file.unlink()

    VOXELS =   [(0, 0, 0, 0.0, 0.0, 0.0), (2, 0, 0, 2.0, 0.0, 0.0),
               (0, 2, 0, 0.0, 2.0, 0.0), (2, 2, 0, 2.0, 2.0, 0.0),
               (0, 0, 2, 0.0, 0.0, 2.0), (2, 0, 2, 2.0, 0.0, 2.0),
               (0, 2, 2, 0.0, 2.0, 2.0), (2, 2, 2, 2.0, 2.0, 2.0),]

    make_test_database(filepath, VOXELS)
    partitions = pm.get_partitions(filepath, 2)
    expected_partitions = []
    base_dir = os.path.dirname(filepath)
    for i in range(1, 9):
        new_path = os.path.join(base_dir, f"partition{i}.db")
        expected_partitions.append(new_path)
    assert partitions == expected_partitions

def test_partition_content_of_multiple_partitions() -> None:
    """Check that all voxels are within the partition"""

    filepath = TEST_PATH / TEST_FILE
    if filepath.exists(): filepath.unlink()
    for file in TEST_PATH.iterdir():
        if file.is_file():
            file.unlink()

    VOXELS =   [(0, 0, 0, 0.0, 0.0, 0.0), (2, 0, 0, 2.0, 0.0, 0.0),
               (0, 2, 0, 0.0, 2.0, 0.0), (2, 2, 0, 2.0, 2.0, 0.0),
               (0, 0, 2, 0.0, 0.0, 2.0), (2, 0, 2, 2.0, 0.0, 2.0),
               (0, 2, 2, 0.0, 2.0, 2.0), (2, 2, 2, 2.0, 2.0, 2.0),]

    make_test_database(filepath, VOXELS)
    partitions = pm.get_partitions(filepath, 2)

    partition_contents = [fetch_test_voxels(partition) for partition in partitions]
    all_partition_voxels = [row for rows in partition_contents for row in rows]
    assert sorted(all_partition_voxels) == sorted(VOXELS)

def test_partition_deletion() -> None:
    """Check that partitions with no voxels are deleted in partition list"""

    filepath = TEST_PATH / TEST_FILE
    if filepath.exists(): filepath.unlink()
    for file in TEST_PATH.iterdir():
        if file.is_file():
            file.unlink()

    VOXELS =   [(0, 0, 0, 0.0, 0.0, 0.0), (2, 2, 0, 2.0, 2.0, 0.0),
               (0, 0, 2, 0.0, 0.0, 2.0), (2, 2, 2, 2.0, 2.0, 2.0),]
    
    make_test_database(filepath, VOXELS)
    partitions = pm.get_partitions(filepath, 2)
    expected_partitions = []
    base_dir = os.path.dirname(filepath)
    for i in range(1, 5):
        new_path = os.path.join(base_dir, f"partition{i}.db")
        expected_partitions.append(new_path)
    assert partitions == expected_partitions

def test_partition_content_after_deletion() -> None:
    """Check that correct partitions with no voxels are deleted"""

    filepath = TEST_PATH / TEST_FILE
    if filepath.exists(): filepath.unlink()
    for file in TEST_PATH.iterdir():
        if file.is_file():
            file.unlink()

    VOXELS =   [(0, 0, 0, 0.0, 0.0, 0.0), (2, 2, 0, 2.0, 2.0, 0.0),
               (0, 0, 2, 0.0, 0.0, 2.0), (2, 2, 2, 2.0, 2.0, 2.0),]
    
    make_test_database(filepath, VOXELS)
    partitions = pm.get_partitions(filepath, 2)

    partition_contents = [fetch_test_voxels(partition) for partition in partitions]
    all_partition_voxels = [row for rows in partition_contents for row in rows]
    assert sorted(all_partition_voxels) == sorted(VOXELS)

def test_negative_coordinates() -> None:
    """Check that correct partitions with no voxels are deleted"""

    filepath = TEST_PATH / TEST_FILE
    if filepath.exists(): filepath.unlink()
    for file in TEST_PATH.iterdir():
        if file.is_file():
            file.unlink()

    VOXELS =   [(-2, 2, -2, -2.0, 2.0, -2.0), (2, -2, 0, 2.0, -2.0, 0.0), (-2, 2, 0, -2.0, 2.0, 0.0)]

    make_test_database(filepath, VOXELS)
    partitions = pm.get_partitions(filepath, 2)
    expected_partitions = []
    base_dir = os.path.dirname(filepath)
    for i in range(1, 4):
        new_path = os.path.join(base_dir, f"partition{i}.db")
        expected_partitions.append(new_path)
    assert partitions == expected_partitions










