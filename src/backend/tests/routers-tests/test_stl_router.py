import app.routers.stl_router as stl_r
from unittest.mock import MagicMock, AsyncMock, patch, call
from types import SimpleNamespace
import pytest


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

#TODO: these tests will need to be rewritten when how files are imported is updated.

def test_get_stl_typical_case() -> None:
    pass

def test_get_stl_non_existent_file() -> None:
    pass

def test_get_stl_not_stl() -> None:
    pass
