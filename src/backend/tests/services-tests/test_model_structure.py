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
TEST_FILE = "test_voxels_structure"

DEFAULT_MATERIAL = 1
DEFAULT_MAGNET = (0.0, 0.0, 0.0)

@pytest.mark.dependency(name="init-db")
def test_create_initial_db() -> None:
    """Check that initial creation works correctly."""

    # if the test file does exist, delete it as VoxelDB should re-create it.
    filepath = TEST_PATH / TEST_FILE
    if filepath.exists(): filepath.unlink()

    assert filepath.exists() == False # check it is not there.

    with VoxelDB(filepath) as db:
        db.init_schema(DEFAULT_MATERIAL, DEFAULT_MAGNET)
        db.set_grid((0.0, 0.0, 0.0), 1.0)
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

@pytest.mark.dependency(depends=["init-db"])
def test_get_grid_conversion_typical_case() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        assert db.get_grid_conversion([34.5, 10.1, -19.3]) == (34, 10, -19)

@pytest.mark.dependency(depends=["init-db"], name="add")
def test_add_new_voxel() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        new = (6,6,6,6.0,6.0,6.0)

        db.add_voxel(*(6, 6, 6))
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

@pytest.mark.dependency(depends=["init-db"], name="set-material")
def test_set_material_on_existing_voxel() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        voxel = (5, 5, 5)
        mat = 2
        db.set_material(*voxel, mat)
        mat_retrieved, *_ = db.get_properties(*voxel)[0]
        assert mat_retrieved == mat

@pytest.mark.dependency(depends=["set-magnet", "set-material"])
def test_get_properties_of_existing_voxel() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        # using the voxel that has been edited in previous tests.
        voxel = (5, 5, 5)
        properties = (2, 1.0, 1.5, 1.8)
        prop_retrieved = db.get_properties(*voxel)[0]
        assert prop_retrieved == properties

@pytest.mark.dependency(depends=["init-db"])
def test_get_properties_of_non_existent_voxel() -> None:
    with pytest.raises(ValueError):
        with VoxelDB(TEST_PATH / TEST_FILE) as db:
            voxel = (6, 6, 6)
            prop_retrieved = db.get_properties(*voxel)

@pytest.mark.dependency(depends=["init-db"], name="set_prop")
def test_set_properties_on_existing_voxel() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        voxel = (3, 3, 3)
        properties = (4, 1.5, 1.9, 2.8)
        db.set_properties(*voxel, *properties)
        prop_retrieved = db.get_properties(*voxel)[0]
        assert prop_retrieved == properties

@pytest.mark.dependency(depends=["init-db", "set_prop"], name="reset_mat")
def test_reset_material_on_existing_voxel() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        voxel = (3, 3, 3)
        db.reset_material(*voxel)
        prop_retrieved = db.get_properties(*voxel)[0]
        assert prop_retrieved[0] == DEFAULT_MATERIAL
        assert prop_retrieved[1:4] == (1.5, 1.9, 2.8)

@pytest.mark.dependency(depends=["init-db", "reset_mat"], name="final")
def test_reset_magnetization_on_existing_voxel() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        voxel = (3, 3, 3)
        db.set_material(*voxel, 4) # set material to its previous value.
        db.reset_magnetization(*voxel)
        prop_retrieved = db.get_properties(*voxel)[0]
        assert prop_retrieved[0] == 4
        assert prop_retrieved[1:4] == DEFAULT_MAGNET  

@pytest.mark.dependency(depends=["init-db"])
def test_set_material_label_associates_label_with_id() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        db.set_material_label(1, "Steel")
        retrieved = db.get_material_label(1)
        assert retrieved == "Steel"


@pytest.mark.dependency(depends=["init-db"])
def test_set_material_label_multiple_ids() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        db.set_material_label(1, "Steel")
        db.set_material_label(2, "Copper")
        assert db.get_material_label(1) == "Steel"
        assert db.get_material_label(2) == "Copper"


@pytest.mark.dependency(depends=["init-db"])
def test_get_material_label_returns_none_for_unlabelled_id() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        assert db.get_material_label(99) is None


@pytest.mark.dependency(depends=["init-db", "final"])
def test_centre_structure_typical() -> None:
    with VoxelDB(TEST_PATH / TEST_FILE) as db:
        # make structure exactly centreable by deleting even voxel.
        db.delete_voxel(5, 5, 5)

        db.centre_structure()
        db.cur.execute("""
                       SELECT ix, iy, iz, x, y, z
                       FROM voxels
                       """)
        rows = db.cur.fetchall()
        assert rows == [(-2, -2, -2, 0.0, 0.0, 0.0),
                        (-1, -1, -1, 1.0, 1.0, 1.0),
                        (0, 0, 0, 2.0, 2.0, 2.0),
                        (1, 1, 1, 3.0, 3.0, 3.0),
                        (2, 2, 2, 4.0, 4.0, 4.0)]


def test_apply_default_material_sets_every_voxel_after_upsert(tmp_path: Path) -> None:
    """Bulk insert only sets geometry; apply ensures project default material on all rows."""
    p = tmp_path / "defaults.db"
    rows = [
        (0, 0, 0, 0.0, 0.0, 0.0),
        (2, 1, 0, 2.0, 1.0, 0.0),
    ]
    with VoxelDB(p) as db:
        db.init_schema(7, (0.0, 0.0, 0.0))
        db.set_grid((0.0, 0.0, 0.0), 1.0)
        db.upsert_many(rows)
        db.apply_default_material_to_all_voxels()
        db.commit()
    with VoxelDB(p) as db:
        db.cur.execute("SELECT material FROM voxels ORDER BY ix, iy, iz")
        assert [r[0] for r in db.cur.fetchall()] == [7, 7]
        assert db.get_meta("default_material") == "7"
