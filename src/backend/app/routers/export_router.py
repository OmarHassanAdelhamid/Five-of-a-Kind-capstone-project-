"""
Routes for file export.
"""


from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

import tempfile

from app.config import VOXEL_STORAGE_DIR
from app.models.schemas import ExportRequest
import app.services.export_service as es

router = APIRouter(prefix="/api/export")

#!! will need to be altered to support partitioning!
@router.get("")
def export_project_csv(request: ExportRequest):
    """
    Handles request to download a voxelized project file as CSV.

    Args:
        project_name (str): The name of the project file to download.

    Returns:
        (FileResponse): The CSV file containing voxel coordinates.
    """
    project_path = VOXEL_STORAGE_DIR / request.project_name
    if not project_path.exists():
        available = [p.name for p in VOXEL_STORAGE_DIR.iterdir() if p.is_file()]
        raise HTTPException(
            status_code=404, 
            detail=f"Project '{request.project_name}' not found. Available projects: {available if available else 'none'}"
        )
    
    try:
        tempfile.tempdir(VOXEL_STORAGE_DIR / "temp")
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")

        success = es.write_csv(project_path, temp_file)

        if (success): # validated successfully
            return FileResponse(
                path=temp_file.name, #!!!
                media_type="text/csv",
                filename=f"{request.export_name}.csv",
            )
        else: # needed property missing in file.
            raise HTTPException(status_code=400, detail=f"File requested to export incomplete: {request.project_name}")
    except HTTPException as httpex:
        raise httpex
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting as CSV: {str(e)}")

