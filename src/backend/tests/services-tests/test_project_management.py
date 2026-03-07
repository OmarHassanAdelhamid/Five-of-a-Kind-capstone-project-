import pytest
import trimesh
import numpy as np
from pathlib import Path
from unittest.mock import MagicMock, call, patch
import app.services.project_management_service as pms

COORD = np.array([
        [1.2, 3.4, 5.6],
        [7.8, 9.0, 1.2],
    ])

TEST_PATH = (Path(__file__).parent.parent / "test-files").resolve()
TEST_FILE = "test_partition_manager.db"
TEST_STL = "test_sphere.stl"

'''
NOTE: no tests were created for initialize_voxel_db as it 
essentially is just calling functions from other files that 
were already tested
'''

def test_user_settings():
    stl_path = TEST_PATH / TEST_STL
    print(stl_path)
    mesh = trimesh.load_mesh(file_obj = stl_path, file_type='stl')
    expected_dim = mesh.extents * 1000000
    new_mesh, vox_len = pms.set_user_req(mesh, 'nm', 'cm', 0.1)
    assert np.array_equal(new_mesh.extents, expected_dim)
    assert vox_len == pytest.approx(0.01)

def test_path_voxel_db():
    '''tests path for voxel database creation to ensure all commands are properly executed'''

    mock_db = MagicMock()
    mock_db.get_grid_conversion.side_effect = [
        (1, 3, 5),
        (7, 9, 1),
    ]

    with patch.object(pms, "VoxelDB") as mock_voxeldb:
        mock_voxeldb.return_value.__enter__.return_value = mock_db
        filepath = TEST_PATH / TEST_FILE

        pms.create_voxel_db(filepath, COORD)

        mock_db.upsert_many.assert_called_once_with([
            (1, 3, 5, 1.2, 3.4, 5.6),
            (7, 9, 1, 7.8, 9.0, 1.2),
        ])
        mock_db.centre_structure.assert_called_once()
        mock_db.commit.assert_called_once()


def test_read_voxels_basic():
    rows = [(1,2,3), (3, 2, 1)]
    vox = pms.read_voxels(rows)
    assert vox.shape == (2,3)
    assert np.array_equal(vox, np.array([[1.,2.,3.],[3.,2.,1.]]))

def test_read_voxels_empty():
    rows = []
    vox = pms.read_voxels(rows)
    assert vox.shape == (0,3)

def test_read_voxels_dtype():
    rows = [(4, 6.0, 2)]
    vox = pms.read_voxels(rows)
    assert vox.dtype == float

def test_read_negative_voxels():
    rows = [(-4, 0, 2)]
    vox = pms.read_voxels(rows)
    assert vox.shape == (1,3)
    assert np.array_equal(vox, np.array([[-4.,0.,2.]]))



