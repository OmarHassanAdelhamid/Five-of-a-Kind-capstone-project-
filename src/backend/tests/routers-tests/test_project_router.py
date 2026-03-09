import app.routers.project_router as pr_r
from app.models.schemas import VoxelizeRequest
from unittest.mock import MagicMock, patch
import pytest
import numpy as np
import os
from fastapi import HTTPException

def test_list_projects_typical_case() -> None:
    with patch.object(pr_r, "PROJECT_STORAGE_DIR") as mock_dir:
        mock_innerdir1 = MagicMock()
        mock_innerdir1.is_dir.return_value = True
        mock_innerdir1.name = "proj1"
        mock_innerdir2 = MagicMock()
        mock_innerdir2.is_dir.return_value = True
        mock_innerdir2.name = "proj2"

        mock_dir.iterdir.return_value = [mock_innerdir1, mock_innerdir2]

        result = pr_r.list_projects()
        assert result == {"projects": ["proj1", "proj2"]}

def test_list_projects_no_folders() -> None:
    with patch.object(pr_r, "PROJECT_STORAGE_DIR") as mock_dir:
        mock_dir.iterdir.return_value = []

        result = pr_r.list_projects()
        assert result == {"projects": []}

def test_list_partitions_typical_case() -> None:
    with patch.object(pr_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value

        mock_project_path.exists.return_value = True

        mock_file1 = MagicMock()
        mock_file1.is_file.return_value = True
        mock_file1.name = "part1.db"

        mock_file2 = MagicMock()
        mock_file2.is_file.return_value = True
        mock_file2.name = "part2.db"

        mock_project_path.iterdir.return_value = [mock_file1, mock_file2]

        result = pr_r.list_partitions("test_project")

        assert result == {
            "project_name": "test_project",
            "partitions": ["part1.db", "part2.db"]
        }

def test_list_partitions_no_partitions() -> None:
    with patch.object(pr_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value

        mock_project_path.exists.return_value = True
        mock_project_path.iterdir.return_value = []

        result = pr_r.list_partitions("test_project")

        assert result == {
            "project_name": "test_project",
            "partitions": []
        }

def test_list_partitions_no_projects() -> None:
    with patch.object(pr_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = False

        mock_dir = MagicMock()
        mock_dir.is_dir.return_value = True
        mock_dir.name = "existing_project"

        mock_storage.iterdir.return_value = [mock_dir]

        with pytest.raises(HTTPException) as exc:
            pr_r.list_partitions("missing_project")

        assert exc.value.status_code == 404

@patch("app.routers.project_router.mt.find_surface")
@patch("app.routers.project_router.pm.read_voxels")
@patch("app.routers.project_router.hm.clear_history")
@pytest.mark.asyncio
async def test_get_surface_route_typical_case(mock_history, mock_proj_m, mock_model_track) -> None:
    with patch.object(pr_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True

        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = True

        mock_history.return_value = None
        mock_proj_m.return_value = np.array([(0.0, 0.0, 0.0)])
        mock_model_track.return_value = [(0.0, 0.0, 0.0)]

        result = await pr_r.get_surface_voxels("proj_name", "part_name")
        assert result == {"project_name": "proj_name",
                          "partition_name": "part_name",
                          "coordinates": [[0.0, 0.0, 0.0]],
                          "num_voxels": 1}

@pytest.mark.asyncio
async def test_get_surface_route_non_existent_project() -> None:
    with patch.object(pr_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = False

        mock_dir = MagicMock()
        mock_dir.is_dir.return_value = True
        mock_dir.name = "existing_project"

        mock_storage.iterdir.return_value = [mock_dir]

        with pytest.raises(HTTPException) as exc:
            await pr_r.get_surface_voxels("proj_name", "part_name")

        assert exc.value.status_code == 404
        assert exc.value.detail == "Project 'proj_name' not found. Available projects: ['existing_project']"

@pytest.mark.asyncio
async def test_get_surface_route_non_existent_partition() -> None:
    with patch.object(pr_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True

        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = False

        mock_part = MagicMock()
        mock_part.is_file.return_value = True
        mock_part.name = "existing_partition"

        mock_project_path.iterdir.return_value = [mock_part]

        with pytest.raises(HTTPException) as exc:
            await pr_r.get_surface_voxels("proj_name", "part_name")

        assert exc.value.status_code == 404
        assert exc.value.detail == "Partition 'part_name' not found within project 'proj_name'. Available partitions: ['existing_partition']"

@patch("app.routers.project_router.mt.find_surface")
@patch("app.routers.project_router.pm.read_voxels")
@patch("app.routers.project_router.hm.clear_history")
@pytest.mark.asyncio
async def test_get_surface_route_empty_partition(mock_history, mock_proj_m, mock_model_track) -> None:
    with patch.object(pr_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True

        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = True

        mock_history.return_value = None
        mock_proj_m.return_value = np.array(None)
        mock_model_track.return_value = None

        result = await pr_r.get_surface_voxels("proj_name", "part_name")
        assert result == {"project_name": "proj_name",
                          "partition_name": "part_name",
                          "coordinates": None,
                          "num_voxels": 0}

@patch("app.routers.project_router.os")
@patch("app.routers.project_router.pm")
@patch("app.routers.project_router.vx.get_voxel_coordinates")
@patch("app.routers.project_router.vx.voxelize")
@patch("app.routers.project_router.ms.create_mesh")
@pytest.mark.asyncio
async def test_voxelize_typical_case(mock_mesh, mock_voxelize, mock_coords, mock_pm, mock_os) -> None:
    with patch.object(pr_r, "STL_STORAGE_DIR") as mock_stl_storage, \
         patch.object(pr_r, "PROJECT_STORAGE_DIR", "ex_dir") as mock_proj_storage:
        mock_stl_path = mock_stl_storage.__truediv__.return_value
        mock_stl_path.exists.return_value = True
        mock_stl_path.open.return_value.__enter__.return_value = "fake_file"

        mock_mesh.return_value = "fake_mesh"
        mock_array = MagicMock()
        mock_array.translation = "fake_translation"
        mock_voxelize.return_value = mock_array
        mock_coords.return_value = "fake_coords"

        mock_os.path.join = os.path.join

        result = await pr_r.voxelize_stl(VoxelizeRequest(stl_filename="file1.stl", voxel_size=0.5, project_name="proj_test"))
        assert result == {
            "message": f"Voxelization Status of STL file (file1.stl): Success",
            "project_folder": "ex_dir/proj_test-dir",
            "voxel_size": 0.5
        }

        mock_mesh.assert_called_once_with("fake_file", file_type="stl")
        mock_voxelize.assert_called_once_with("fake_mesh", 0.5)
        mock_coords.assert_called_once_with(mock_array)
        mock_pm.initialize_voxel_db.assert_called_once_with("ex_dir/proj_test-dir/proj_test", "fake_translation", 0.5, 1, [0.0, 0.0, 0.0])
        mock_pm.create_voxel_db.assert_called_once_with("ex_dir/proj_test-dir/proj_test", "fake_coords")

@pytest.mark.asyncio
async def test_voxelize_non_existent_stl() -> None:
    with patch.object(pr_r, "STL_STORAGE_DIR") as mock_stl_storage:
        mock_stl_path = mock_stl_storage.__truediv__.return_value
        mock_stl_path.exists.return_value = False

        with pytest.raises(HTTPException) as exc:
            await pr_r.voxelize_stl(VoxelizeRequest(stl_filename="file1.stl", voxel_size=0.5, project_name="proj_test"))

        assert exc.value.status_code == 404
        assert exc.value.detail == "Filename file1.stl not found on server!"


@patch("app.routers.project_router.mt.find_surface")
@patch("app.routers.project_router.pm.read_voxels")
@patch("app.routers.project_router.hm.clear_history")
@pytest.mark.asyncio
async def test_get_surface_route_find_surface_raises(mock_clear, mock_read_voxels, mock_find_surface) -> None:
    with patch.object(pr_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True
        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = True
        mock_find_surface.side_effect = ValueError("db read failed")

        with pytest.raises(HTTPException) as exc:
            await pr_r.get_surface_voxels("proj_name", "part_name")

        assert exc.value.status_code == 500
        assert "db read failed" in exc.value.detail


