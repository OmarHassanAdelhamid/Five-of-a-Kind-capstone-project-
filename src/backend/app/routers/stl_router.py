"""
Routes for STL model management.
"""


from pathlib import Path #!!
from typing import List

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.config import MODEL_DIR

router = APIRouter(prefix="/api/stl", tags=["stl"])

@router.get("", response_model=dict[str, List[str]]) # POSSIBLE DUPLICATE OF BELOW FUNC?
def list_stl_models():
    """List all available STL models."""
    models = sorted(p.name for p in MODEL_DIR.glob("*.stl"))
    return {"models": models}

@router.get("/list-stl", response_model=list[str])
async def get_available_stl():
    """
    Handles request to list all available STL files in the sample file directory.

    Returns:
        files (list): filenames of all files in sample file directory.
    """
    files = [entry.name for entry in MODEL_DIR.iterdir() if entry.is_file()]
    return files

@router.post("/upload-stl")
async def upload_stl_model(stl_file: UploadFile): 
    """
    Handles request to add an STL file into the sample file directory.

    Args:
        stl_file (UploadFile): The STL file to be added to the directory.

    Returns:
        (dict): Contains message reflecting status of the upload.
    """
    try:
        with open(f"{MODEL_DIR}/{stl_file.filename}", "wb") as f:
            file_contents = await stl_file.read()
            f.write(file_contents)

        return {"message": f"STL file ({stl_file.filename}) uploaded successfully."}
    except Exception as e:
        return {"message": f"The following error occured whilst uploading STL file ({stl_file.filename}): {str(e)}"}

@router.get("/{filename}") # this should be changed to use a schema, add response_model param.
def get_stl_model(filename: str):
    """Get an STL model file."""
    file_path = _resolve_model_path(filename)
    return FileResponse(
        path=file_path,
        media_type="model/stl",
        filename=file_path.name,
    )

def _resolve_model_path(filename: str) -> Path:
    """Resolve and validate model file path."""
    file_path = (MODEL_DIR / filename).resolve()

    try:
        file_path.relative_to(MODEL_DIR.resolve())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid model path.") from exc

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail=f"{filename} not found on server.")

    if file_path.suffix.lower() != ".stl":
        raise HTTPException(status_code=400, detail="Requested file is not an STL model.")

    return file_path

@router.get("/sphere") # can probably be removed.
def get_sphere_model():
    """Get the sphere model (convenience endpoint)."""
    return get_stl_model("sphere.stl")
