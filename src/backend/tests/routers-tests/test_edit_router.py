import app.routers.edit_router as ed_r
from app.models.schemas import RetrieveLayerRequest, LayerAxis, UpdateVoxelsRequest, UpdateAction, ModelDelta, UpdateHistoryRequest, HistoryAction
from app.services.history_management_service import EmptyHistoryException
from unittest.mock import MagicMock, patch, call
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from pathlib import Path

@patch("app.routers.edit_router.mt.get_z_layer")
@pytest.mark.asyncio
async def test_get_layer_z_typical_case(mock_layer) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True
        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = True

        mock_layer.return_value = [(2, 0, -1, 2.0, 0.0, -1.0, 1, 0.0, 0.0, 0.0),
                                   (2, 1, -1, 2.0, 1.0, -1.0, 1, 0.0, 0.0, 0.0),
                                   (2, 2, -1, 2.0, 2.0, -1.0, 1, 0.0, 0.0, 0.0),
                                   (2, 3, -1, 2.0, 3.0, -1.0, 1, 0.0, 0.0, 0.0),
                                   (2, 2, 0, 2.0, 2.0, 0.0, 1, 0.0, 0.0, 0.0),
                                   (2, 3, 0, 2.0, 3.0, 0.0, 1, 0.0, 0.0, 0.0)]

        result = await ed_r.get_layer(RetrieveLayerRequest(project_name="proj_1", partition_name="part_1", 
                                                           layer_index=1, axis='z'))
        
        assert result == {
            "project_name": "proj_1",
            "partition_name": "part_1",
            "layer_index": 1,
            "num_voxels": 6,
            "voxels": [(2, 0, -1, 2.0, 0.0, -1.0, 1, 0.0, 0.0, 0.0),
                       (2, 1, -1, 2.0, 1.0, -1.0, 1, 0.0, 0.0, 0.0),
                       (2, 2, -1, 2.0, 2.0, -1.0, 1, 0.0, 0.0, 0.0),
                       (2, 3, -1, 2.0, 3.0, -1.0, 1, 0.0, 0.0, 0.0),
                       (2, 2, 0, 2.0, 2.0, 0.0, 1, 0.0, 0.0, 0.0),
                       (2, 3, 0, 2.0, 3.0, 0.0, 1, 0.0, 0.0, 0.0)],
            "axis": 'z',
        }

def test_get_layer_undefined_axis() -> None:
    with pytest.raises(ValidationError):
        RetrieveLayerRequest(project_name="proj_name",
                             partition_name="part_name",
                             layer_index=3,
                             axis='a')

@pytest.mark.asyncio
async def test_get_layer_z_non_existent_project() -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = False

        mock_dir = MagicMock()
        mock_dir.is_dir.return_value = True
        mock_dir.name = "existing_project"

        mock_storage.iterdir.return_value = [mock_dir]

        with pytest.raises(HTTPException) as exc:
            await ed_r.get_layer(RetrieveLayerRequest(project_name="proj_1", partition_name="part_1", 
                                                      layer_index=1, axis=LayerAxis.Z))

        assert exc.value.status_code == 404
        assert exc.value.detail == "Project 'proj_1' not found. Available projects: ['existing_project']"

@pytest.mark.asyncio
async def test_get_layer_z_non_existent_partition() -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True

        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = False

        mock_part = MagicMock()
        mock_part.is_file.return_value = True
        mock_part.name = "existing_partition"

        mock_project_path.iterdir.return_value = [mock_part]

        with pytest.raises(HTTPException) as exc:
            await ed_r.get_layer(RetrieveLayerRequest(project_name="proj_1", partition_name="part_1", 
                                                      layer_index=1, axis=LayerAxis.Z))

        assert exc.value.status_code == 404
        assert exc.value.detail == "Partition 'part_1' not found within project 'proj_1'. Available partitions: ['existing_partition']"

@patch("app.routers.edit_router.mt.get_z_layer")
@pytest.mark.asyncio
async def test_get_layer_z_invalid_layer(mock_layer) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True
        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = True

        mock_layer.return_value = []

        with pytest.raises(HTTPException) as exc:
            await ed_r.get_layer(RetrieveLayerRequest(project_name="proj_1", partition_name="part_1", 
                                                           layer_index=5, axis='z'))
    
        assert exc.value.status_code == 404
        assert exc.value.detail == "Layer at Z=5 not found."


@patch("app.routers.edit_router.mt.get_x_layer")
@pytest.mark.asyncio
async def test_get_layer_x_typical_case(mock_layer) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True
        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = True
        mock_layer.return_value = [(0, 1, 2, 0.0, 1.0, 2.0, 1, 0.0, 0.0, 0.0)]

        result = await ed_r.get_layer(RetrieveLayerRequest(
            project_name="p", partition_name="part", layer_index=0, axis=LayerAxis.X
        ))
        assert result["axis"] == "x"
        assert result["num_voxels"] == 1
        mock_layer.assert_called_once()


@patch("app.routers.edit_router.mt.get_y_layer")
@pytest.mark.asyncio
async def test_get_layer_y_typical_case(mock_layer) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True
        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = True
        mock_layer.return_value = [(1, 0, 2, 1.0, 0.0, 2.0, 1, 0.0, 0.0, 0.0)]

        result = await ed_r.get_layer(RetrieveLayerRequest(
            project_name="p", partition_name="part", layer_index=0, axis=LayerAxis.Y
        ))
        assert result["axis"] == "y"
        assert result["num_voxels"] == 1
        mock_layer.assert_called_once()


@patch("app.routers.edit_router.mt.get_z_layer")
@pytest.mark.asyncio
async def test_get_layer_service_raises(mock_layer) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True
        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = True
        mock_layer.side_effect = RuntimeError("db error")

        with pytest.raises(HTTPException) as exc:
            await ed_r.get_layer(RetrieveLayerRequest(
                project_name="p", partition_name="part", layer_index=0, axis=LayerAxis.Z
            ))
        assert exc.value.status_code == 500
        assert "db error" in exc.value.detail


@pytest.mark.asyncio
async def test_update_voxels_empty_list() -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True
        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = True

        with pytest.raises(HTTPException) as exc:
            await ed_r.update_voxels(UpdateVoxelsRequest(
                project_name="p", partition_name="part", voxels=[], action=UpdateAction.UPDATE, materialID=1
            ))
        assert exc.value.status_code == 400
        assert "at least one voxel" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_update_both_material_and_magnetization_invalid() -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True
        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = True

        with patch("app.routers.edit_router.mt.get_full_voxels", return_value=[]):
            with pytest.raises(HTTPException) as exc:
                await ed_r.update_voxels(UpdateVoxelsRequest(
                    project_name="p", partition_name="part", voxels=[(0, 0, 0)],
                    action=UpdateAction.UPDATE, materialID=1, magnetization=[1.0, 0.0, 0.0]
                ))
            assert exc.value.status_code == 400
            assert "both" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_update_neither_material_nor_magnetization_invalid() -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True
        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = True

        with patch("app.routers.edit_router.mt.get_full_voxels", return_value=[]):
            with pytest.raises(HTTPException) as exc:
                await ed_r.update_voxels(UpdateVoxelsRequest(
                    project_name="p", partition_name="part", voxels=[(0, 0, 0)],
                    action=UpdateAction.UPDATE
                ))
            assert exc.value.status_code == 400
            assert "neither" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_update_non_existent_project() -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = False

        mock_dir = MagicMock()
        mock_dir.is_dir.return_value = True
        mock_dir.name = "existing_project"

        mock_storage.iterdir.return_value = [mock_dir]

        with pytest.raises(HTTPException) as exc:
            await ed_r.update_voxels(UpdateVoxelsRequest(project_name="proj_name",
                                                     partition_name="part_name",
                                                     voxels=[(0,0,0)],
                                                     action=UpdateAction.UPDATE,
                                                     materialID=3))

        assert exc.value.status_code == 404
        assert exc.value.detail == "Project 'proj_name' not found. Available projects: ['existing_project']"


@pytest.mark.asyncio
async def test_update_non_existent_partition() -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True

        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = False

        mock_part = MagicMock()
        mock_part.is_file.return_value = True
        mock_part.name = "existing_partition"

        mock_project_path.iterdir.return_value = [mock_part]

        with pytest.raises(HTTPException) as exc:
            await ed_r.update_voxels(UpdateVoxelsRequest(project_name="proj_name",
                                                     partition_name="part_name",
                                                     voxels=[(0,0,0)],
                                                     action=UpdateAction.UPDATE,
                                                     materialID=3))

        assert exc.value.status_code == 404
        assert exc.value.detail == "Partition 'part_name' not found within project 'proj_name'. Available partitions: ['existing_partition']"

    
@patch("app.routers.edit_router.mt.get_full_voxels")
@patch("app.routers.edit_router.em")
@patch("app.routers.edit_router.hm.record_change")
@pytest.mark.asyncio
async def test_update_material(mock_record, mock_em, mock_get_voxels) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            mock_get_voxels.side_effect = [[(0, 0, 0, 1, 0.0, 0.0, 0.0)], [(0, 0, 0, 3, 0.0, 0.0, 0.0)]]

            result = await ed_r.update_voxels(UpdateVoxelsRequest(project_name="proj_name",
                                                                partition_name="part_name",
                                                                voxels=[(0,0,0)],
                                                                action=UpdateAction.UPDATE,
                                                                materialID=3))
            
            assert result == {
                "message": "Model updated successfully",
                "project_name": "proj_name",
                "partition_name": "part_name",
                "num_voxels": 1,
            }

            mock_get_voxels.assert_has_calls([call("proj_dir/proj_name/part_name", [(0,0,0)]),
                                              call("proj_dir/proj_name/part_name", [(0,0,0)])])
            mock_em.update_voxel_materials.assert_called_once_with(mock_storage/"proj_name"/"part_name",
                                                                   [(0,0,0)], 3)
            mock_record.assert_called_once_with(ModelDelta(old_voxels=[(0, 0, 0, 1, 0.0, 0.0, 0.0)], 
                                                       new_voxels=[(0, 0, 0, 3, 0.0, 0.0, 0.0)]))

@patch("app.routers.edit_router.mt.get_full_voxels")
@patch("app.routers.edit_router.em")
@patch("app.routers.edit_router.hm.record_change")
@pytest.mark.asyncio
async def test_update_magnet(mock_record, mock_em, mock_get_voxels) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            mock_get_voxels.side_effect = [[(0, 0, 0, 1, 0.0, 0.0, 0.0)], [(0, 0, 0, 1, 3.0, 5.0, 30.0)]]

            result = await ed_r.update_voxels(UpdateVoxelsRequest(project_name="proj_name",
                                                                partition_name="part_name",
                                                                voxels=[(0,0,0)],
                                                                action=UpdateAction.UPDATE,
                                                                magnetization=(3.0, 5.0, 30.0)))
            
            assert result == {
                "message": "Model updated successfully",
                "project_name": "proj_name",
                "partition_name": "part_name",
                "num_voxels": 1,
            }

            mock_get_voxels.assert_has_calls([call("proj_dir/proj_name/part_name", [(0,0,0)]),
                                              call("proj_dir/proj_name/part_name", [(0,0,0)])])
            mock_em.update_voxel_magnetization.assert_called_once_with(mock_storage/"proj_name"/"part_name",
                                                                   [(0,0,0)], (3.0, 5.0, 30.0))
            mock_record.assert_called_once_with(ModelDelta(old_voxels=[(0, 0, 0, 1, 0.0, 0.0, 0.0)], 
                                                       new_voxels=[(0, 0, 0, 1, 3.0, 5.0, 30.0)]))

@pytest.mark.asyncio
async def test_update_material_and_magnet() -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            with pytest.raises(HTTPException) as exc:
                result = await ed_r.update_voxels(UpdateVoxelsRequest(project_name="proj_name",
                                                                    partition_name="part_name",
                                                                    voxels=[(0,0,0)],
                                                                    action=UpdateAction.UPDATE,
                                                                    material=3,
                                                                    magnetization=(3.0, 5.0, 30.0)))
                
                assert exc.value.status_code == 400
                assert exc.value.detail == "Invalid request; UpdateAction was UPDATE, but both a materialID and magnetization were passed."

@pytest.mark.asyncio
async def test_update_neither() -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            with pytest.raises(HTTPException) as exc:
                result = await ed_r.update_voxels(UpdateVoxelsRequest(project_name="proj_name",
                                                                    partition_name="part_name",
                                                                    voxels=[(0,0,0)],
                                                                    action=UpdateAction.UPDATE))
                
                assert exc.value.status_code == 400
                assert exc.value.detail == "Invalid request; UpdateAction was UPDATE, but neither a materialID or magnetization was passed."

@patch("app.routers.edit_router.mt.get_full_voxels")
@patch("app.routers.edit_router.em")
@patch("app.routers.edit_router.hm.record_change")
@pytest.mark.asyncio
async def test_update_reset_material(mock_record, mock_em, mock_get_voxels) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            mock_get_voxels.side_effect = [[(0, 0, 0, 5, 0.0, 0.0, 0.0)], [(0, 0, 0, 1, 0.0, 0.0, 0.0)]]

            result = await ed_r.update_voxels(UpdateVoxelsRequest(project_name="proj_name",
                                                                partition_name="part_name",
                                                                voxels=[(0,0,0)],
                                                                action=UpdateAction.RESET_MATERIAL))
            
            assert result == {
                "message": "Model updated successfully",
                "project_name": "proj_name",
                "partition_name": "part_name",
                "num_voxels": 1,
            }

            mock_get_voxels.assert_has_calls([call("proj_dir/proj_name/part_name", [(0,0,0)]),
                                              call("proj_dir/proj_name/part_name", [(0,0,0)])])
            mock_em.reset_voxel_materials.assert_called_once_with(mock_storage/"proj_name"/"part_name",
                                                                   [(0,0,0)])
            mock_record.assert_called_once_with(ModelDelta(old_voxels=[(0, 0, 0, 5, 0.0, 0.0, 0.0)], 
                                                       new_voxels=[(0, 0, 0, 1, 0.0, 0.0, 0.0)]))

@patch("app.routers.edit_router.mt.get_full_voxels")
@patch("app.routers.edit_router.em")
@patch("app.routers.edit_router.hm.record_change")
@pytest.mark.asyncio
async def test_update_reset_magnet(mock_record, mock_em, mock_get_voxels) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            mock_get_voxels.side_effect = [[(0, 0, 0, 5, 10.0, 30.0, 40.0)], [(0, 0, 0, 5, 0.0, 0.0, 0.0)]]

            result = await ed_r.update_voxels(UpdateVoxelsRequest(project_name="proj_name",
                                                                partition_name="part_name",
                                                                voxels=[(0,0,0)],
                                                                action=UpdateAction.RESET_MAGNETIZATION))
            
            assert result == {
                "message": "Model updated successfully",
                "project_name": "proj_name",
                "partition_name": "part_name",
                "num_voxels": 1,
            }

            mock_get_voxels.assert_has_calls([call("proj_dir/proj_name/part_name", [(0,0,0)]),
                                              call("proj_dir/proj_name/part_name", [(0,0,0)])])
            mock_em.reset_voxel_magnetizations.assert_called_once_with(mock_storage/"proj_name"/"part_name",
                                                                   [(0,0,0)])
            mock_record.assert_called_once_with(ModelDelta(old_voxels=[(0, 0, 0, 5, 10.0, 30.0, 40.0)], 
                                                       new_voxels=[(0, 0, 0, 5, 0.0, 0.0, 0.0)]))

@patch("app.routers.edit_router.mt.get_full_voxels")
@patch("app.routers.edit_router.em")
@patch("app.routers.edit_router.hm.record_change")
@pytest.mark.asyncio
async def test_update_add_voxels(mock_record, mock_em, mock_get_voxels) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            mock_get_voxels.side_effect = [[(0, 0, 0, 1, 0.0, 0.0, 0.0)]]

            result = await ed_r.update_voxels(UpdateVoxelsRequest(project_name="proj_name",
                                                                partition_name="part_name",
                                                                voxels=[(0,0,0)],
                                                                action=UpdateAction.ADD))
            
            assert result == {
                "message": "Model updated successfully",
                "project_name": "proj_name",
                "partition_name": "part_name",
                "num_voxels": 1,
            }

            mock_get_voxels.assert_called_once_with("proj_dir/proj_name/part_name", [(0,0,0)])
            mock_em.add_voxels.assert_called_once_with(mock_storage/"proj_name"/"part_name",
                                                                   [(0,0,0)])
            mock_record.assert_called_once_with(ModelDelta(old_voxels=[], 
                                                       new_voxels=[(0, 0, 0, 1, 0.0, 0.0, 0.0)]))

@pytest.mark.asyncio
async def test_update_add_empty_list() -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            with pytest.raises(HTTPException) as exc:
                await ed_r.update_voxels(UpdateVoxelsRequest(project_name="proj_name",
                                                                partition_name="part_name",
                                                                voxels=[],
                                                                action=UpdateAction.ADD))
            
                assert exc.value.status_code == 400
                assert exc.value.detail == "UpdateRequest must contain at least one voxel to be updated."

@patch("app.routers.edit_router.mt.get_full_voxels")
@patch("app.routers.edit_router.em")
@patch("app.routers.edit_router.hm.record_change")
@pytest.mark.asyncio
async def test_update_delete_voxels(mock_record, mock_em, mock_get_voxels) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            mock_get_voxels.side_effect = [[(0, 0, 0, 4, 3.0, 45.0, 60.0)]]

            result = await ed_r.update_voxels(UpdateVoxelsRequest(project_name="proj_name",
                                                                partition_name="part_name",
                                                                voxels=[(0,0,0)],
                                                                action=UpdateAction.DELETE))
            
            assert result == {
                "message": "Model updated successfully",
                "project_name": "proj_name",
                "partition_name": "part_name",
                "num_voxels": 1,
            }

            mock_get_voxels.assert_called_once_with("proj_dir/proj_name/part_name", [(0,0,0)])
            mock_em.delete_voxels.assert_called_once_with(mock_storage/"proj_name"/"part_name",
                                                                   [(0,0,0)])
            mock_record.assert_called_once_with(ModelDelta(old_voxels=[(0, 0, 0, 4, 3.0, 45.0, 60.0)], 
                                                       new_voxels=[]))

@pytest.mark.asyncio
async def test_update_delete_empty_list() -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            with pytest.raises(HTTPException) as exc:
                await ed_r.update_voxels(UpdateVoxelsRequest(project_name="proj_name",
                                                                partition_name="part_name",
                                                                voxels=[],
                                                                action=UpdateAction.DELETE))
            
                assert exc.value.status_code == 400
                assert exc.value.detail == "UpdateRequest must contain at least one voxel to be updated."

def test_update_undefined_action() -> None:
    with pytest.raises(ValidationError):
        UpdateVoxelsRequest(project_name="proj_name",
                            partition_name="part_name",
                            voxels=[],
                            action="undefined")

@pytest.mark.asyncio
async def test_history_non_existent_project() -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = False

        mock_dir = MagicMock()
        mock_dir.is_dir.return_value = True
        mock_dir.name = "existing_project"

        mock_storage.iterdir.return_value = [mock_dir]

        with pytest.raises(HTTPException) as exc:
            await ed_r.update_history(UpdateHistoryRequest(project_name="proj_name",
                                                           partition_name="part_name",
                                                           action=HistoryAction.UNDO))

        assert exc.value.status_code == 404
        assert exc.value.detail == "Project 'proj_name' not found. Available projects: ['existing_project']"

@pytest.mark.asyncio
async def test_history_non_existent_partition() -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True

        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = False

        mock_part = MagicMock()
        mock_part.is_file.return_value = True
        mock_part.name = "existing_partition"

        mock_project_path.iterdir.return_value = [mock_part]

        with pytest.raises(HTTPException) as exc:
            await ed_r.update_history(UpdateHistoryRequest(project_name="proj_name",
                                                           partition_name="part_name",
                                                           action=HistoryAction.UNDO))

        assert exc.value.status_code == 404
        assert exc.value.detail == "Partition 'part_name' not found within project 'proj_name'. Available partitions: ['existing_partition']"

@patch("app.routers.edit_router.hm")
@patch("app.routers.edit_router.em")
@pytest.mark.asyncio
async def test_history_undo_update(mock_em, mock_hist) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            mock_hist.undo_request.return_value = ModelDelta(old_voxels=[(0, 0, 0, 1, 0.0, 0.0, 0.0)], 
                                                new_voxels=[(0, 0, 0, 3, 0.0, 0.0, 0.0)])
            mock_hist.is_undo_empty.return_value = False
            mock_hist.is_redo_empty.return_value = False
            
            result = await ed_r.update_history(UpdateHistoryRequest(project_name="proj_name",
                                                                    partition_name="part_name",
                                                                    action=HistoryAction.UNDO))
            
            assert result == {
                "message": "undo executed successfully",
                "undo_empty": "False",
                "redo_empty": "False"
            }

            mock_em.update_voxel_properties.assert_called_once_with(str(mock_storage/"proj_name"/"part_name"), [(0, 0, 0, 1, 0.0, 0.0, 0.0)])
            mock_hist.undo_request.assert_called_once()

@patch("app.routers.edit_router.hm")
@patch("app.routers.edit_router.em")
@pytest.mark.asyncio
async def test_history_undo_add(mock_em, mock_hist) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            mock_hist.undo_request.return_value = ModelDelta(old_voxels=[], 
                                                new_voxels=[(0, 0, 0, 1, 0.0, 0.0, 0.0)])
            mock_hist.is_undo_empty.return_value = False
            mock_hist.is_redo_empty.return_value = False
            
            result = await ed_r.update_history(UpdateHistoryRequest(project_name="proj_name",
                                                                    partition_name="part_name",
                                                                    action=HistoryAction.UNDO))
            
            assert result == {
                "message": "undo executed successfully",
                "undo_empty": "False",
                "redo_empty": "False"
            }

            mock_em.delete_voxels.assert_called_once_with(str(mock_storage/"proj_name"/"part_name"), [(0, 0, 0, 1, 0.0, 0.0, 0.0)])
            mock_hist.undo_request.assert_called_once()

@patch("app.routers.edit_router.hm")
@patch("app.routers.edit_router.em")
@pytest.mark.asyncio
async def test_history_undo_delete(mock_em, mock_hist) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            mock_hist.undo_request.return_value = ModelDelta(old_voxels=[(0, 0, 0, 3, 0.0, 20.0, 0.0)], 
                                                new_voxels=[])
            mock_hist.is_undo_empty.return_value = False
            mock_hist.is_redo_empty.return_value = False
            
            result = await ed_r.update_history(UpdateHistoryRequest(project_name="proj_name",
                                                                    partition_name="part_name",
                                                                    action=HistoryAction.UNDO))
            
            assert result == {
                "message": "undo executed successfully",
                "undo_empty": "False",
                "redo_empty": "False"
            }

            mock_em.add_voxels.assert_called_once_with(str(mock_storage/"proj_name"/"part_name"), [(0, 0, 0, 3, 0.0, 20.0, 0.0)])
            mock_hist.undo_request.assert_called_once()

@patch("app.routers.edit_router.hm")
@pytest.mark.asyncio
async def test_history_undo_empty_undo(mock_hist) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            mock_hist.undo_request.side_effect = EmptyHistoryException("No history to undo.")

            with pytest.raises(HTTPException) as exc:
                await ed_r.update_history(UpdateHistoryRequest(project_name="proj_name",
                                                            partition_name="part_name",
                                                            action=HistoryAction.UNDO))
                
            assert exc.value.status_code == 400
            assert exc.value.detail == "Bad history request: No history to undo."
                
@patch("app.routers.edit_router.hm")
@patch("app.routers.edit_router.em")
@pytest.mark.asyncio
async def test_history_redo_update(mock_em, mock_hist) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            mock_hist.redo_request.return_value = ModelDelta(old_voxels=[(0, 0, 0, 1, 0.0, 0.0, 0.0)], 
                                                new_voxels=[(0, 0, 0, 3, 0.0, 0.0, 0.0)])
            mock_hist.is_undo_empty.return_value = False
            mock_hist.is_redo_empty.return_value = False
            
            result = await ed_r.update_history(UpdateHistoryRequest(project_name="proj_name",
                                                                    partition_name="part_name",
                                                                    action=HistoryAction.REDO))
            
            assert result == {
                "message": "redo executed successfully",
                "undo_empty": "False",
                "redo_empty": "False"
            }

            mock_em.update_voxel_properties.assert_called_once_with(str(mock_storage/"proj_name"/"part_name"), [(0, 0, 0, 3, 0.0, 0.0, 0.0)])
            mock_hist.redo_request.assert_called_once()

@patch("app.routers.edit_router.hm")
@patch("app.routers.edit_router.em")
@pytest.mark.asyncio
async def test_history_redo_add(mock_em, mock_hist) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            mock_hist.redo_request.return_value = ModelDelta(old_voxels=[], 
                                                new_voxels=[(0, 0, 0, 1, 0.0, 0.0, 0.0)])
            mock_hist.is_undo_empty.return_value = False
            mock_hist.is_redo_empty.return_value = False
            
            result = await ed_r.update_history(UpdateHistoryRequest(project_name="proj_name",
                                                                    partition_name="part_name",
                                                                    action=HistoryAction.REDO))
            
            assert result == {
                "message": "redo executed successfully",
                "undo_empty": "False",
                "redo_empty": "False"
            }

            mock_em.add_voxels.assert_called_once_with(str(mock_storage/"proj_name"/"part_name"), [(0, 0, 0, 1, 0.0, 0.0, 0.0)])
            mock_hist.redo_request.assert_called_once()

@patch("app.routers.edit_router.hm")
@patch("app.routers.edit_router.em")
@pytest.mark.asyncio
async def test_history_redo_delete(mock_em, mock_hist) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            mock_hist.redo_request.return_value = ModelDelta(old_voxels=[(0, 0, 0, 3, 0.0, 20.0, 0.0)], 
                                                new_voxels=[])
            mock_hist.is_undo_empty.return_value = False
            mock_hist.is_redo_empty.return_value = False
            
            result = await ed_r.update_history(UpdateHistoryRequest(project_name="proj_name",
                                                                    partition_name="part_name",
                                                                    action=HistoryAction.REDO))
            
            assert result == {
                "message": "redo executed successfully",
                "undo_empty": "False",
                "redo_empty": "False"
            }

            mock_em.delete_voxels.assert_called_once_with(str(mock_storage/"proj_name"/"part_name"), [(0, 0, 0, 3, 0.0, 20.0, 0.0)])
            mock_hist.redo_request.assert_called_once()

@patch("app.routers.edit_router.hm")
@pytest.mark.asyncio
async def test_history_redo_empty_redo(mock_hist) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR", Path("proj_dir")) as mock_storage:
        with patch("pathlib.Path.exists", return_value=True):
            mock_hist.redo_request.side_effect = EmptyHistoryException("No history to redo.")

            with pytest.raises(HTTPException) as exc:
                await ed_r.update_history(UpdateHistoryRequest(project_name="proj_name",
                                                            partition_name="part_name",
                                                            action=HistoryAction.REDO))
                
            assert exc.value.status_code == 400
            assert exc.value.detail == "Bad history request: No history to redo."

def test_history_undefined_request() -> None:
    with pytest.raises(ValidationError):
        UpdateHistoryRequest(project_name="proj_name",
                             partition_name="part_name",
                             action="DO")

@pytest.mark.asyncio
async def test_get_layers_list_non_existent_project() -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = False

        mock_dir = MagicMock()
        mock_dir.is_dir.return_value = True
        mock_dir.name = "existing_project"

        mock_storage.iterdir.return_value = [mock_dir]

        with pytest.raises(HTTPException) as exc:
            await ed_r.get_layers(project_name="proj_name", partition_name="part_name")

        assert exc.value.status_code == 404
        assert exc.value.detail == "Project 'proj_name' not found. Available projects: ['existing_project']"

@pytest.mark.asyncio
async def test_get_layers_list_non_existent_partition() -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True

        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = False

        mock_part = MagicMock()
        mock_part.is_file.return_value = True
        mock_part.name = "existing_partition"

        mock_project_path.iterdir.return_value = [mock_part]

        with pytest.raises(HTTPException) as exc:
            await ed_r.get_layers(project_name="proj_name", partition_name="part_name", axis='z')

        assert exc.value.status_code == 404
        assert exc.value.detail == "Partition 'part_name' not found within project 'proj_name'. Available partitions: ['existing_partition']"

@pytest.mark.asyncio
async def test_get_layers_list_undefined_axis() -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True

        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = True

        with pytest.raises(HTTPException) as exc:
            await ed_r.get_layers(project_name="proj_name", partition_name="part_name", axis='a')

            assert exc.value.status_code == 400
            assert exc.value.detail == "axis must be 'z', 'x', or 'y'"

@patch("app.routers.edit_router.mt")
@pytest.mark.asyncio
async def test_get_layers_list_typical_case(mock_tracker) -> None:
    with patch.object(ed_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = True

        mock_partition_path = mock_project_path.__truediv__.return_value
        mock_partition_path.exists.return_value = True

        mock_tracker.z_directory.return_value = [(1, 1.0), (2, 2.0), (3, 3.0)]

        result = await ed_r.get_layers(project_name="proj_name", partition_name="part_name", axis='z')

        assert result == {
            "project_name": "proj_name",
            "partition_name": "part_name",
            "num_layers": 3,
            "layers": [{'coordinate': 1, 'index': 1.0}, 
                       {'coordinate': 2, 'index': 2.0}, 
                       {'coordinate': 3, 'index': 3.0}],
            "axis": 'z',
        }

