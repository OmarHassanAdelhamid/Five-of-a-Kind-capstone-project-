import pytest
from pathlib import Path
from app.services.model_structure_service import VoxelDB

TEST_VOXELS = [(0, 0, 0, 0.0, 0.0, 0.0),
               (1, 1, 1, 1.0, 1.0, 1.0),
               (2, 2, 2, 2.0, 2.0, 2.0),
               (3, 3, 3, 3.0, 3.0, 3.0),
               (4, 4, 4, 4.0, 4.0, 4.0),
               (5, 5, 5, 5.0, 5.0, 5.0)]
TEST_PATH = (Path(__file__).parent.parent / "test-files").resolve()
TEST_FILE = "test_voxels"

@pytest.mark.dependency(name="init-db")
def test_create_initial_db() -> None:
    """Check that initial creation works correctly."""

    # if the test file does exist, delete it as VoxelDB should re-create it.
    filepath = TEST_PATH / TEST_FILE
    if filepath.exists(): filepath.unlink()

    assert filepath.exists() == False # check it is not there.

    with VoxelDB(filepath) as db:
        db.upsert_many(TEST_VOXELS)
        db.commit()
        assert filepath.exists() == True # check it is now created.

        # fetch all rows and determine they match the original.
        db.cur.execute("""
                       SELECT ix, iy, iz, x, y, z
                       FROM voxels
                       """)
        rows = db.cur.fetchall()
        assert rows == TEST_VOXELS

# TODO: tests for origin metadata

@pytest.mark.dependency(depends=["init-db"], name="add")
def test_add_new_voxel() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        new = (6,6,6,6.0,6.0,6.0)

        db.add_voxel(*new)
        TEST_VOXELS.append(new)

        db.cur.execute("""
                       SELECT ix, iy, iz, x, y, z
                       FROM voxels
                       """)
        rows = db.cur.fetchall()
        assert rows == TEST_VOXELS

    
@pytest.mark.dependency(depends=["add"], name="delete")
def test_delete_existing_voxel() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        new = (6,6,6,6.0,6.0,6.0)

        db.delete_voxel(new[0], new[1], new[2])
        TEST_VOXELS.pop()

        db.cur.execute("""
                       SELECT ix, iy, iz, x, y, z
                       FROM voxels
                       """)
        rows = db.cur.fetchall()
        assert rows == TEST_VOXELS

@pytest.mark.dependency(depends=["delete"])
def test_delete_non_existent_voxel() -> None:
    #! is this behavior something we want?
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        new = (6,6,6,6.0,6.0,6.0)

        db.delete_voxel(new[0], new[1], new[2])

        db.cur.execute("""
                       SELECT ix, iy, iz, x, y, z
                       FROM voxels
                       """)
        rows = db.cur.fetchall()
        assert rows == TEST_VOXELS

@pytest.mark.dependency(depends=["init-db"], name="set-magnet")
def test_set_magnet_on_existing_voxel() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        voxel = (5, 5, 5)
        mag = (1.0, 1.5, 1.8)
        db.set_magnetization(*voxel, *mag)
        _, *mag_retrieved = db.get_properties(*voxel)[0]
        assert tuple(mag_retrieved) == mag

@pytest.mark.dependency(depends=["init-db"])
def test_set_magnet_on_non_existent_voxel() -> None:
    #! TODO: unsure what behavior should be in this case.
    pass

@pytest.mark.dependency(depends=["init-db"], name="set-material")
def test_set_material_on_existing_voxel() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        voxel = (5, 5, 5)
        mat = 2
        db.set_material(*voxel, mat)
        mat_retrieved, *_ = db.get_properties(*voxel)[0]
        assert mat_retrieved == mat

@pytest.mark.dependency(depends=["init-db"])
def test_set_material_on_non_existent_voxel() -> None:
    #! TODO: unsure what behavior should be in this case.
    pass

@pytest.mark.dependency(depends=["set-magnet", "set-material"])
def test_get_properties_of_existing_voxel() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        # using the voxel that has been edited in previous tests.
        voxel = (5, 5, 5)
        properties = (2, 1.0, 1.5, 1.8)
        prop_retrieved = db.get_properties(*voxel)[0]
        assert prop_retrieved == properties

# TODO: determine what behavior should be for non-existent voxel cases.
#! for incomplete: need to implement proper null cases for properties.

@pytest.mark.dependency(depends=["init-db"])
def test_get_properties_of_non_existent_voxel() -> None:
    pass

@pytest.mark.dependency(depends=["init-db"])
def test_get_properties_of_voxel_with_no_assigned_properties() -> None:
    pass

@pytest.mark.dependency(depends=["init-db"])
def test_get_properties_of_incomplete_voxel() -> None:
    pass

@pytest.mark.dependency(depends=["init-db"])
def test_set_properties_on_existing_voxel() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        # using the voxel that has been edited in previous tests.
        voxel = (3, 3, 3)
        properties = (4, 1.5, 1.9, 2.8)
        db.set_properties(*voxel, *properties)
        prop_retrieved = db.get_properties(*voxel)[0]
        assert prop_retrieved == properties

@pytest.mark.dependency(depends=["init-db"])
def test_set_properties_on_non_existent_voxel() -> None:
    pass




