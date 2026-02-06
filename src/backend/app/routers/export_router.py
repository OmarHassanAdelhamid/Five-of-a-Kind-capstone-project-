"""
Routes for file export.
"""


from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

from app.config import VOXEL_STORAGE_DIR

router = APIRouter(prefix="/api/export")

#!! needs to be redone!
@router.get("/{project_name}") #update to use schema?
def download_voxel_csv(project_name: str):
    """
    Handles request to download a voxelized project file as CSV.

    Args:
        project_name (str): The name of the project file to download.

    Returns:
        (FileResponse): The CSV file containing voxel coordinates.
    """
    project_path = VOXEL_STORAGE_DIR / project_name
    
    if not project_path.exists():
        available = [p.name for p in VOXEL_STORAGE_DIR.iterdir() if p.is_file()]
        raise HTTPException(
            status_code=404, 
            detail=f"Project '{project_name}' not found. Available projects: {available if available else 'none'}"
        )
    
    return FileResponse(
        path=str(project_path),
        media_type="text/csv",
        filename=f"{project_name}.csv",
    )

