import pytest
from pathlib import Path
from app.services.model_structure_service import VoxelDB
import app.services.model_editing_service as em

TEST_VOXELS = [(0, 0, 0, 0.0, 0.0, 0.0),
               (1, 1, 1, 1.0, 1.0, 1.0),
               (2, 2, 2, 2.0, 2.0, 2.0),
               (3, 3, 3, 3.0, 3.0, 3.0),
               (4, 4, 4, 4.0, 4.0, 4.0),
               (5, 5, 5, 5.0, 5.0, 5.0)]
TEST_PATH = (Path(__file__).parent.parent / "test-files").resolve()
TEST_FILE = "test_voxels_editing"

# Test setup
# if the test file does exist, delete it
filepath = TEST_PATH / TEST_FILE
if filepath.exists(): filepath.unlink()

with VoxelDB(filepath) as db: # recreate file.
    db.init_schema(1, (0.0, 0.0, 0.0))
    db.set_grid((0.0, 0.0, 0.0), 1.0)
    db.upsert_many(TEST_VOXELS)
    db.commit()

def _get_all_voxels(filepath):
    # helper function to get all voxels to test against in below test cases.
    with VoxelDB(filepath) as db:
        db.cur.execute("""
                       SELECT ix, iy, iz, x, y, z, material, magnet_magnitude, magnet_polar, magnet_azimuth
                       FROM voxels
                       """)
        return db.cur.fetchall()

def test_update_material_valid_materialID():
    em.update_voxel_materials(filepath, [(0, 0, 0), (1, 1, 1)], 2)
    
    # explicitly check that all rows in the db are updated as intended.
    assert _get_all_voxels(filepath) == [(0, 0, 0, 0.0, 0.0, 0.0, 2, 0.0, 0.0, 0.0),
                                         (1, 1, 1, 1.0, 1.0, 1.0, 2, 0.0, 0.0, 0.0),
                                         (2, 2, 2, 2.0, 2.0, 2.0, 1, 0.0, 0.0, 0.0),
                                         (3, 3, 3, 3.0, 3.0, 3.0, 1, 0.0, 0.0, 0.0),
                                         (4, 4, 4, 4.0, 4.0, 4.0, 1, 0.0, 0.0, 0.0),
                                         (5, 5, 5, 5.0, 5.0, 5.0, 1, 0.0, 0.0, 0.0)]

def test_update_material_invalid_materialID():
    with pytest.raises(ValueError):
        em.update_voxel_materials(filepath, [(0, 0, 0), (1, 1, 1)], -10)

def test_update_material_invalid_materialID_boundary():
    with pytest.raises(ValueError):
        em.update_voxel_materials(filepath, [(0, 0, 0), (1, 1, 1)], 0)

def test_update_magnetization_valid_magnetization():
    em.update_voxel_magnetization(filepath, [(2, 2, 2), (3, 3, 3)], 75.5, 283.5)
    
    assert _get_all_voxels(filepath) == [(0, 0, 0, 0.0, 0.0, 0.0, 2, 0.0, 0.0, 0.0),
                                         (1, 1, 1, 1.0, 1.0, 1.0, 2, 0.0, 0.0, 0.0),
                                         (2, 2, 2, 2.0, 2.0, 2.0, 1, 1.0, 75.5, 283.5),
                                         (3, 3, 3, 3.0, 3.0, 3.0, 1, 1.0, 75.5, 283.5),
                                         (4, 4, 4, 4.0, 4.0, 4.0, 1, 0.0, 0.0, 0.0),
                                         (5, 5, 5, 5.0, 5.0, 5.0, 1, 0.0, 0.0, 0.0)]

def test_update_magnetization_valid_magnetization_polar_boundaries():
    em.update_voxel_magnetization(filepath, [(2, 2, 2), (3, 3, 3)], 0.0, 283.5)
    
    assert _get_all_voxels(filepath) == [(0, 0, 0, 0.0, 0.0, 0.0, 2, 0.0, 0.0, 0.0),
                                         (1, 1, 1, 1.0, 1.0, 1.0, 2, 0.0, 0.0, 0.0),
                                         (2, 2, 2, 2.0, 2.0, 2.0, 1, 1.0, 0.0, 283.5),
                                         (3, 3, 3, 3.0, 3.0, 3.0, 1, 1.0, 0.0, 283.5),
                                         (4, 4, 4, 4.0, 4.0, 4.0, 1, 0.0, 0.0, 0.0),
                                         (5, 5, 5, 5.0, 5.0, 5.0, 1, 0.0, 0.0, 0.0)]
    
    em.update_voxel_magnetization(filepath, [(2, 2, 2), (3, 3, 3)], 180, 283.5)
    
    assert _get_all_voxels(filepath) == [(0, 0, 0, 0.0, 0.0, 0.0, 2, 0.0, 0.0, 0.0),
                                         (1, 1, 1, 1.0, 1.0, 1.0, 2, 0.0, 0.0, 0.0),
                                         (2, 2, 2, 2.0, 2.0, 2.0, 1, 1.0, 180, 283.5),
                                         (3, 3, 3, 3.0, 3.0, 3.0, 1, 1.0, 180, 283.5),
                                         (4, 4, 4, 4.0, 4.0, 4.0, 1, 0.0, 0.0, 0.0),
                                         (5, 5, 5, 5.0, 5.0, 5.0, 1, 0.0, 0.0, 0.0)]

def test_update_magnetization_invalid_polar_angle():
    with pytest.raises(ValueError):
        em.update_voxel_magnetization(filepath, [(2, 2, 2), (3, 3, 3)], -10.0, 283.5)

    with pytest.raises(ValueError):
        em.update_voxel_magnetization(filepath, [(2, 2, 2), (3, 3, 3)], 180.1, 283.5)

def test_update_magnetization_valid_magnetization_azimuth_boundaries():
    em.update_voxel_magnetization(filepath, [(2, 2, 2), (3, 3, 3)], 180, 0)
    
    assert _get_all_voxels(filepath) == [(0, 0, 0, 0.0, 0.0, 0.0, 2, 0.0, 0.0, 0.0),
                                         (1, 1, 1, 1.0, 1.0, 1.0, 2, 0.0, 0.0, 0.0),
                                         (2, 2, 2, 2.0, 2.0, 2.0, 1, 1.0, 180, 0),
                                         (3, 3, 3, 3.0, 3.0, 3.0, 1, 1.0, 180, 0),
                                         (4, 4, 4, 4.0, 4.0, 4.0, 1, 0.0, 0.0, 0.0),
                                         (5, 5, 5, 5.0, 5.0, 5.0, 1, 0.0, 0.0, 0.0)]
    
    em.update_voxel_magnetization(filepath, [(2, 2, 2), (3, 3, 3)], 180, 360)
    
    assert _get_all_voxels(filepath) == [(0, 0, 0, 0.0, 0.0, 0.0, 2, 0.0, 0.0, 0.0),
                                         (1, 1, 1, 1.0, 1.0, 1.0, 2, 0.0, 0.0, 0.0),
                                         (2, 2, 2, 2.0, 2.0, 2.0, 1, 1.0, 180, 360),
                                         (3, 3, 3, 3.0, 3.0, 3.0, 1, 1.0, 180, 360),
                                         (4, 4, 4, 4.0, 4.0, 4.0, 1, 0.0, 0.0, 0.0),
                                         (5, 5, 5, 5.0, 5.0, 5.0, 1, 0.0, 0.0, 0.0)]

def test_update_magnetization_invalid_azimuth_angle():
    with pytest.raises(ValueError):
        em.update_voxel_magnetization(filepath, [(2, 2, 2), (3, 3, 3)], 180, -10)

    with pytest.raises(ValueError):
        em.update_voxel_magnetization(filepath, [(2, 2, 2), (3, 3, 3)], 180, 360.1)

def test_update_properties_valid_voxels():
    em.update_voxel_properties(filepath, [(4, 4, 4, 3, 60.0, 100.0), (5, 5, 5, 3, 60.0, 100.0)])

    assert _get_all_voxels(filepath) == [(0, 0, 0, 0.0, 0.0, 0.0, 2, 0.0, 0.0, 0.0),
                                         (1, 1, 1, 1.0, 1.0, 1.0, 2, 0.0, 0.0, 0.0),
                                         (2, 2, 2, 2.0, 2.0, 2.0, 1, 1.0, 180, 360),
                                         (3, 3, 3, 3.0, 3.0, 3.0, 1, 1.0, 180, 360),
                                         (4, 4, 4, 4.0, 4.0, 4.0, 3, 1.0, 60.0, 100.0),
                                         (5, 5, 5, 5.0, 5.0, 5.0, 3, 1.0, 60.0, 100.0)]

def test_update_properties_invalid_voxels_material():
    with pytest.raises(ValueError):
        em.update_voxel_properties(filepath, [(4, 4, 4, -1, 60.0, 100.0), 
                                              (5, 5, 5, 3, 60.0, 100.0)])
        
    assert _get_all_voxels(filepath) == [(0, 0, 0, 0.0, 0.0, 0.0, 2, 0.0, 0.0, 0.0),
                                         (1, 1, 1, 1.0, 1.0, 1.0, 2, 0.0, 0.0, 0.0),
                                         (2, 2, 2, 2.0, 2.0, 2.0, 1, 1.0, 180, 360),
                                         (3, 3, 3, 3.0, 3.0, 3.0, 1, 1.0, 180, 360),
                                         (4, 4, 4, 4.0, 4.0, 4.0, 3, 1.0, 60.0, 100.0),
                                         (5, 5, 5, 5.0, 5.0, 5.0, 3, 1.0, 60.0, 100.0)]

def test_update_properties_invalid_voxels_polar():
    with pytest.raises(ValueError):
        em.update_voxel_properties(filepath, [(4, 4, 4, 3, 190.0, 100.0), 
                                              (5, 5, 5, 3, 60.0, 100.0)])
        
    assert _get_all_voxels(filepath) == [(0, 0, 0, 0.0, 0.0, 0.0, 2, 0.0, 0.0, 0.0),
                                         (1, 1, 1, 1.0, 1.0, 1.0, 2, 0.0, 0.0, 0.0),
                                         (2, 2, 2, 2.0, 2.0, 2.0, 1, 1.0, 180, 360),
                                         (3, 3, 3, 3.0, 3.0, 3.0, 1, 1.0, 180, 360),
                                         (4, 4, 4, 4.0, 4.0, 4.0, 3, 1.0, 60.0, 100.0),
                                         (5, 5, 5, 5.0, 5.0, 5.0, 3, 1.0, 60.0, 100.0)]

def test_update_properties_invalid_voxels_azimuth():
    with pytest.raises(ValueError):
        em.update_voxel_properties(filepath, [(4, 4, 4, 3, 60.0, 100.0), 
                                              (5, 5, 5, 3, 60.0, -90.0)])
        
    assert _get_all_voxels(filepath) == [(0, 0, 0, 0.0, 0.0, 0.0, 2, 0.0, 0.0, 0.0),
                                         (1, 1, 1, 1.0, 1.0, 1.0, 2, 0.0, 0.0, 0.0),
                                         (2, 2, 2, 2.0, 2.0, 2.0, 1, 1.0, 180, 360),
                                         (3, 3, 3, 3.0, 3.0, 3.0, 1, 1.0, 180, 360),
                                         (4, 4, 4, 4.0, 4.0, 4.0, 3, 1.0, 60.0, 100.0),
                                         (5, 5, 5, 5.0, 5.0, 5.0, 3, 1.0, 60.0, 100.0)]

def test_add_voxels_typical_case():
    em.add_voxels(filepath, [(6, 6, 6), (7, 7, 7)])

    assert _get_all_voxels(filepath) == [(0, 0, 0, 0.0, 0.0, 0.0, 2, 0.0, 0.0, 0.0),
                                         (1, 1, 1, 1.0, 1.0, 1.0, 2, 0.0, 0.0, 0.0),
                                         (2, 2, 2, 2.0, 2.0, 2.0, 1, 1.0, 180, 360),
                                         (3, 3, 3, 3.0, 3.0, 3.0, 1, 1.0, 180, 360),
                                         (4, 4, 4, 4.0, 4.0, 4.0, 3, 1.0, 60.0, 100.0),
                                         (5, 5, 5, 5.0, 5.0, 5.0, 3, 1.0, 60.0, 100.0),
                                         (6, 6, 6, 6.0, 6.0, 6.0, 1, 0.0, 0.0, 0.0),
                                         (7, 7, 7, 7.0, 7.0, 7.0, 1, 0.0, 0.0, 0.0),] # voxels added should have default properties.

def test_delete_voxels_typical_case():
    em.delete_voxels(filepath, [(6, 6, 6), (7, 7, 7)])

    assert _get_all_voxels(filepath) == [(0, 0, 0, 0.0, 0.0, 0.0, 2, 0.0, 0.0, 0.0),
                                         (1, 1, 1, 1.0, 1.0, 1.0, 2, 0.0, 0.0, 0.0),
                                         (2, 2, 2, 2.0, 2.0, 2.0, 1, 1.0, 180, 360),
                                         (3, 3, 3, 3.0, 3.0, 3.0, 1, 1.0, 180, 360),
                                         (4, 4, 4, 4.0, 4.0, 4.0, 3, 1.0, 60.0, 100.0),
                                         (5, 5, 5, 5.0, 5.0, 5.0, 3, 1.0, 60.0, 100.0)]

def test_reset_materials():
    em.reset_voxel_materials(filepath, [(4, 4, 4), (5, 5, 5)])

    assert _get_all_voxels(filepath) == [(0, 0, 0, 0.0, 0.0, 0.0, 2, 0.0, 0.0, 0.0),
                                         (1, 1, 1, 1.0, 1.0, 1.0, 2, 0.0, 0.0, 0.0),
                                         (2, 2, 2, 2.0, 2.0, 2.0, 1, 1.0, 180, 360),
                                         (3, 3, 3, 3.0, 3.0, 3.0, 1, 1.0, 180, 360),
                                         (4, 4, 4, 4.0, 4.0, 4.0, 1, 1.0, 60.0, 100.0), # should reset to defaults.
                                         (5, 5, 5, 5.0, 5.0, 5.0, 1, 1.0, 60.0, 100.0)]

def test_reset_magnetization():
    em.update_voxel_materials(filepath, [(4, 4, 4), (5, 5, 5)], 3) # reset material to previous, ensure only magnet is reset.
    em.reset_voxel_magnetizations(filepath, [(4, 4, 4), (5, 5, 5)])

    assert _get_all_voxels(filepath) == [(0, 0, 0, 0.0, 0.0, 0.0, 2, 0.0, 0.0, 0.0),
                                         (1, 1, 1, 1.0, 1.0, 1.0, 2, 0.0, 0.0, 0.0),
                                         (2, 2, 2, 2.0, 2.0, 2.0, 1, 1.0, 180, 360),
                                         (3, 3, 3, 3.0, 3.0, 3.0, 1, 1.0, 180, 360),
                                         (4, 4, 4, 4.0, 4.0, 4.0, 3, 0.0, 0.0, 0.0), # should reset to defaults.
                                         (5, 5, 5, 5.0, 5.0, 5.0, 3, 0.0, 0.0, 0.0)]

def test_update_magnetization_non_existent_voxel():
    em.update_voxel_magnetization(filepath, [(99, 99, 99)], 45.0, 90.0)

    # DB should be identical to what it was before this call
    rows = _get_all_voxels(filepath)
    indices = [(r[0], r[1], r[2]) for r in rows]
    assert (99, 99, 99) not in indices
    # ensure all existing voxels are unaffected
    for row in rows:
        assert row[0] != 99 and row[1] != 99 and row[2] != 99

def test_update_material_non_existent_voxel():
    em.update_voxel_materials(filepath, [(99, 99, 99)], 3)

    rows = _get_all_voxels(filepath)
    indices = [(r[0], r[1], r[2]) for r in rows]
    assert (99, 99, 99) not in indices

def test_reset_material_and_magnetization_simultaneously():
    # Precondition: set non-default values for both
    em.update_voxel_materials(filepath, [(0, 0, 0), (1, 1, 1)], 5)
    em.update_voxel_magnetization(filepath, [(0, 0, 0), (1, 1, 1)], 90.0, 180.0)

    # Verify non-default values are actually set
    before = _get_all_voxels(filepath)
    assert before[0][6] == 5       # material
    assert before[0][8] == 90.0    # polar
    assert before[0][9] == 180.0   # azimuth

    # Reset both in one combined call sequence (as TC49 describes)
    em.reset_voxel_materials(filepath, [(0, 0, 0), (1, 1, 1)])
    em.reset_voxel_magnetizations(filepath, [(0, 0, 0), (1, 1, 1)])

    # Assert both are default in a single read
    after = _get_all_voxels(filepath)
    for row in after[:2]:  # only check the two voxels we touched
        mat, magnet_polar, magnet_azimuth = row[6], row[8], row[9]
        assert mat == 1
        assert magnet_polar == 0.0
        assert magnet_azimuth == 0.0