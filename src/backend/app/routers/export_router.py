"""
Routes for file export.
"""


from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse

import tempfile
import os

from app.config import PROJECT_STORAGE_DIR
import app.services.export_service as es

router = APIRouter(prefix="/api/export")

@router.get("")
def export_project_csv(project_name: str, export_name: str, background_tasks: BackgroundTasks):
    """
    Handles request to download a voxelized project file as CSV.

    Args:
        project_name (str): The name of the project file to download.

    Returns:
        (FileResponse): The CSV file containing voxel coordinates.
    """
    project_path = PROJECT_STORAGE_DIR / project_name

    if not project_path.exists():
        available = [p.name for p in PROJECT_STORAGE_DIR.iterdir() if p.is_dir()]
        raise HTTPException(
            status_code=404, 
            detail=f"Project '{project_name}' not found. Available projects: {available if available else 'none'}"
        )
    
    try:
        temp_dir = tempfile.mkdtemp()
        temp_csv = os.path.join(temp_dir, f"{export_name}.csv")

        # pass project directory of partitions to exporter.
        success = es.write_csv(project_path, temp_csv)
        if (not success): # needed property missing in voxel db.
            raise HTTPException(status_code=400, 
                                detail=f"File requested to export incomplete: {project_name}")

        # remove temp dir/file within it once the file is returned to the user.
        background_tasks.add_task(_cleanup, temp_csv)
        background_tasks.add_task(os.rmdir, temp_dir)

        return FileResponse(
            path=temp_csv,
            media_type="text/csv",
            filename=f"{export_name}.csv",
        )
            
    except HTTPException as httpex:
        raise httpex
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting as CSV: {str(e)}")

def _cleanup(path: str):
    """
    """
    if os.path.exists(path):
        os.remove(path)

