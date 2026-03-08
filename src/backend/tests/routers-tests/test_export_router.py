import app.routers.export_router as ex_r
from app.routers.export_router import router
from unittest.mock import MagicMock, patch
import pytest
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.testclient import TestClient
from pathlib import Path

app = FastAPI()
app.include_router(router)


def test_export_non_existent_project() -> None:
    with patch.object(ex_r, "PROJECT_STORAGE_DIR") as mock_storage:
        mock_project_path = mock_storage.__truediv__.return_value
        mock_project_path.exists.return_value = False

        mock_dir = MagicMock()
        mock_dir.is_dir.return_value = True
        mock_dir.name = "existing_project"

        mock_storage.iterdir.return_value = [mock_dir]

        mock_btask = MagicMock()

        with pytest.raises(HTTPException) as exc:
            ex_r.export_project_csv(project_name="proj_name",
                                    export_name="exp_name",
                                    background_tasks=mock_btask)
            
        assert exc.value.status_code == 404
        assert exc.value.detail == "Project 'proj_name' not found. Available projects: ['existing_project']"

def test_export_typical_case(tmp_path) -> None:
    proj_dir = tmp_path / "proj_name"
    proj_dir.mkdir()
    fake_temp_dir = tmp_path / "temp"
    fake_temp_dir.mkdir()

    fake_csv = fake_temp_dir / "exp_name.csv"
    fake_csv.write_text("x,y,z\n1,2,3")

    with patch.object(ex_r, "PROJECT_STORAGE_DIR", tmp_path), \
         patch("app.routers.export_router.tempfile.mkdtemp", return_value=str(fake_temp_dir)), \
         patch("app.routers.export_router.es.write_csv", return_value=True) as mock_export:
        mock_btask = MagicMock()

        client = TestClient(app)
        response = client.get(
            "/api/export",
            params={"project_name": "proj_name", "export_name": "exp_name"}
        )

        assert response.status_code == 200
        assert response.headers["content-disposition"] == 'attachment; filename="exp_name.csv"'
        assert response.headers["content-type"].startswith("text/csv")
        assert response.content == b"x,y,z\n1,2,3"
        
        mock_export.assert_called_once_with(proj_dir, str(fake_csv))
        mock_btask.add_task.assert_has_calls([])
        
def test_export_incomplete_voxels(tmp_path) -> None:
    proj_dir = tmp_path / "proj_name"
    proj_dir.mkdir()
    fake_temp_dir = tmp_path / "temp"
    fake_temp_dir.mkdir()

    fake_csv = fake_temp_dir / "exp_name.csv"
    fake_csv.write_text("x,y,z\n1,2,3")

    with patch.object(ex_r, "PROJECT_STORAGE_DIR", tmp_path), \
         patch("app.routers.export_router.tempfile.mkdtemp", return_value=str(fake_temp_dir)), \
         patch("app.routers.export_router.es.write_csv", return_value=False) as mock_export:
        mock_btask = MagicMock()

        client = TestClient(app)
        with pytest.raises(HTTPException) as exc:
            client.get(
                "/api/export",
                params={"project_name": "proj_name", "export_name": "exp_name"}
            )

        assert exc.value.status_code == 400
        assert exc.value.detail == "File requested to export incomplete: proj_name"
        
        mock_export.assert_called_once_with(proj_dir, str(fake_csv))
        mock_btask.add_task.assert_has_calls([])

