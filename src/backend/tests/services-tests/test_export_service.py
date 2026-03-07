from unittest.mock import MagicMock, patch, call
import app.services.export_service as es
import os
from pathlib import Path

@patch("builtins.open")
@patch("csv.writer")
def test_file_export_typical_case(mock_csv_writer, mock_open) -> None:
    mock_db = MagicMock()
    mock_db.cur.fetchall.side_effect = [[(1.0, 1.0, 1.0, 5, 4.0, 60.0, 30.0)],
                                        [(2.0, 2.0, 2.0, 4, 3.0, 61.0, 31.0)]]
    
    mock_csv_writer_instance = MagicMock()
    mock_csv_writer.return_value = mock_csv_writer_instance

    mock_file1 = MagicMock()
    mock_file1.is_file.return_value = True

    mock_file2 = MagicMock()
    mock_file2.is_file.return_value = True

    mock_project_path = MagicMock()
    mock_project_path.iterdir.return_value = [mock_file1, mock_file2]

    mock_file = MagicMock()
    mock_open.return_value.__enter__.return_value = mock_file

    with patch.object(es, "VoxelDB") as mock_voxeldb:
        mock_voxeldb.return_value.__enter__.return_value = mock_db

        ret_bool = es.write_csv(mock_project_path, "exported.csv")

        mock_voxeldb.assert_has_calls([call(mock_file1), call(mock_file2)], any_order=True)

        mock_csv_writer.assert_called_once_with(mock_file)
        mock_csv_writer_instance.writerow.assert_called_once_with(["x", "y", "z", "materialID", "magnet_magnitude", "magnet_polar", "magnet_azimuth"])
        mock_csv_writer_instance.writerows.assert_called_once_with([(1.0, 1.0, 1.0, 5, 4.0, 60.0, 30.0), (2.0, 2.0, 2.0, 4, 3.0, 61.0, 31.0)])

        assert ret_bool == True

@patch("builtins.open")
@patch("csv.writer")
def test_file_export_extra_directory(mock_csv_writer, mock_open) -> None:
    mock_db = MagicMock()
    mock_db.cur.fetchall.side_effect = [[(1.0, 1.0, 1.0, 5, 4.0, 60.0, 30.0)],
                                        [(2.0, 2.0, 2.0, 4, 3.0, 61.0, 31.0)]]
    
    mock_csv_writer_instance = MagicMock()
    mock_csv_writer.return_value = mock_csv_writer_instance

    mock_file1 = MagicMock()
    mock_file1.is_file.return_value = True

    mock_file2 = MagicMock()
    mock_file2.is_file.return_value = True

    mock_file3 = MagicMock()
    mock_file3.is_file.return_value = False

    mock_project_path = MagicMock()
    mock_project_path.iterdir.return_value = [mock_file1, mock_file2, mock_file3]

    mock_file = MagicMock()
    mock_open.return_value.__enter__.return_value = mock_file

    with patch.object(es, "VoxelDB") as mock_voxeldb:
        mock_voxeldb.return_value.__enter__.return_value = mock_db

        ret_bool = es.write_csv(mock_project_path, "exported.csv")

        mock_voxeldb.assert_has_calls([call(mock_file1), call(mock_file2)], any_order=True)

        mock_csv_writer.assert_called_once_with(mock_file)
        mock_csv_writer_instance.writerow.assert_called_once_with(["x", "y", "z", "materialID", "magnet_magnitude", "magnet_polar", "magnet_azimuth"])
        mock_csv_writer_instance.writerows.assert_called_once_with([(1.0, 1.0, 1.0, 5, 4.0, 60.0, 30.0), (2.0, 2.0, 2.0, 4, 3.0, 61.0, 31.0)])

        assert ret_bool == True

@patch("builtins.open")
def test_file_export_empty_directory(mock_open) -> None:

    mock_project_path = MagicMock()
    mock_project_path.iterdir.return_value = []
    mock_file = MagicMock()
    mock_open.return_value.__enter__.return_value = mock_file

    ret_bool = es.write_csv(mock_project_path, "exported.csv")

    assert ret_bool == False

