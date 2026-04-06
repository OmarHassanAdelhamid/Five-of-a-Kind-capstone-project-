"""
HTTP API for sample STL assets: list, upload, measure bounding size, and download binary STL files.

Course / submission fill-ins:
    @author Daniel Maurer, Olivia Reich, Khalid Farag, Andrew Bovbel
    @lastModified 2026/03/23

Repository history (earliest commit touching this file): 340a236 2026-01-22 Khalid Farag
Provenance: git log --follow -- src/backend/app/routers/stl_router.py
"""

from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse

import app.services.mesh_service as ms

from app.config import STL_STORAGE_DIR

router = APIRouter(prefix="/api/stl", tags=["stl"])

@router.get("", response_model=dict[str, List[str]]) # POSSIBLE DUPLICATE OF BELOW FUNC?
def list_stl_models():
    """List all available STL models. Same filenames as ``/list-stl``, wrapped as ``{\"models\": [...]}`` for object-shaped clients."""
    models = sorted(p.name for p in STL_STORAGE_DIR.glob("*.stl"))
    return {"models": models}

@router.get("/list-stl", response_model=list[str])
async def get_available_stl():
    """Plain list of STL filenames under shared storage (no wrapper object).

    Handles request to list all available STL files in the sample file directory.

    Returns:
        files (list): filenames of all files in sample file directory.
    """
    files = [entry.name for entry in STL_STORAGE_DIR.iterdir() if entry.is_file()]
    return files

@router.post("/upload-stl")
async def upload_stl_model(stl_file: UploadFile): 
    """Persist a user-uploaded STL into shared storage for later voxelization.

    Handles request to add an STL file into the sample file directory.

    Args:
        stl_file (UploadFile): The STL file to be added to the directory.

    Returns:
        (dict): Contains message reflecting status of the upload.
    """
    try:
        with open(f"{STL_STORAGE_DIR}/{stl_file.filename}", "wb") as f:
            file_contents = await stl_file.read()
            f.write(file_contents)

        return {"message": f"STL file ({stl_file.filename}) uploaded successfully."}
    except Exception as e:
        return {"message": f"The following error occured whilst uploading STL file ({stl_file.filename}): {str(e)}"}

@router.get("/dimensions")
async def get_stl_dimensions(stl_filename: str):
    """Axis-aligned extent of the named STL for UI scaling and previews."""
    stl_path = STL_STORAGE_DIR / stl_filename

    mesh = ms.load_stl_mesh(stl_path)
    model_dim = mesh.extents

    return {
        "stl_filename": stl_filename,
        "dimensions": {
            "x": round(float(model_dim[0]), 8),
            "y": round(float(model_dim[1]), 8),
            "z": round(float(model_dim[2]), 8),
        }
    }

@router.get("/{filename}")
def get_stl_model(filename: str):
    """Get an STL model file. Served as a download/stream for 3D viewing."""
    file_path = _resolve_model_path(filename)
    return FileResponse(
        path=file_path,
        media_type="model/stl",
        filename=file_path.name,
    )

def _resolve_model_path(filename: str) -> Path:
    """Resolve and validate model file path."""
    file_path = (STL_STORAGE_DIR/ filename).resolve()

    try:
        file_path.relative_to(STL_STORAGE_DIR.resolve())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid model path.") from exc

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail=f"{filename} not found on server.")

    if file_path.suffix.lower() != ".stl":
        raise HTTPException(status_code=400, detail="Requested file is not an STL model.")

    return file_path
