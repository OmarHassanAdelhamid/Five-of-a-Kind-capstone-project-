import app.routers.stl_router as stl_r
from unittest.mock import MagicMock, AsyncMock, patch
from types import SimpleNamespace
import pytest
from fastapi import HTTPException
from fastapi.responses import FileResponse


def test_list_stl_models_typical_case() -> None:
    with patch.object(stl_r, "STL_STORAGE_DIR") as mock_dir:
        mock_dir.glob.return_value = [
                SimpleNamespace(name="file1.stl"),
                SimpleNamespace(name="file2.stl"),
            ]
        
        result = stl_r.list_stl_models()
        assert result == {"models": ["file1.stl", "file2.stl"]}

def test_list_stl_models_empty_dir() -> None:
    with patch.object(stl_r, "STL_STORAGE_DIR") as mock_dir:
        mock_dir.glob.return_value = []
        
        result = stl_r.list_stl_models()
        assert result == {"models": []}

@patch("builtins.open")
@pytest.mark.asyncio
async def test_upload_stl_typical_case(mock_open) -> None:
    mock_file = MagicMock()
    mock_stl_upload = MagicMock(filename="file1.stl")
    mock_stl_upload.read = AsyncMock(return_value=b"test contents")
    
    mock_open.return_value.__enter__.return_value = mock_file

    result = await stl_r.upload_stl_model(mock_stl_upload)
    assert result == {"message": "STL file (file1.stl) uploaded successfully."}
    mock_stl_upload.read.assert_called_once()
    mock_file.write.assert_called_once_with(b"test contents")

def test_get_stl_typical_case() -> None:
    with patch.object(stl_r, "STL_STORAGE_DIR") as mock_dir:
        mock_path = MagicMock()
        mock_path.is_file.return_value = True
        mock_path.suffix = ".stl"
        mock_path.name = "model.stl"
        mock_path.resolve.return_value = mock_path
        mock_dir.__truediv__.return_value.resolve.return_value = mock_path

        result = stl_r.get_stl_model("model.stl")

        assert isinstance(result, FileResponse)
        assert result.path == mock_path
        assert result.media_type == "model/stl"
        assert result.filename == "model.stl"


def test_get_stl_non_existent_file() -> None:
    with patch.object(stl_r, "STL_STORAGE_DIR") as mock_dir:
        mock_path = MagicMock()
        mock_path.is_file.return_value = False
        mock_path.resolve.return_value = mock_path
        mock_dir.__truediv__.return_value.resolve.return_value = mock_path

        with pytest.raises(HTTPException) as exc_info:
            stl_r.get_stl_model("missing.stl")

        assert exc_info.value.status_code == 404
        assert exc_info.value.detail == "missing.stl not found on server."


def test_get_stl_not_stl() -> None:
    with patch.object(stl_r, "STL_STORAGE_DIR") as mock_dir:
        mock_path = MagicMock()
        mock_path.is_file.return_value = True
        mock_path.suffix = ".txt"
        mock_path.resolve.return_value = mock_path
        mock_dir.__truediv__.return_value.resolve.return_value = mock_path

        with pytest.raises(HTTPException) as exc_info:
            stl_r.get_stl_model("document.txt")

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Requested file is not an STL model."
