# pyright: reportMissingImports=false

"""
FastAPI application entry point.
"""

from pathlib import Path
from typing import List

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import app.services.mesh_service as ms
import app.services.voxel_service as vx
import app.services.project_service as pj
from fastapi.responses import FileResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKEND_DIR = Path(__file__).parent.parent
SAMPLE_DIR = BACKEND_DIR / "sample-project-files"
STL_STORAGE_DIR = SAMPLE_DIR / "stl"
VOXEL_STORAGE_DIR = SAMPLE_DIR / "voxels"
MODEL_DIR = STL_STORAGE_DIR  # Alias for compatibility with contributor's code

# Ensure directories exist
for directory in (STL_STORAGE_DIR, VOXEL_STORAGE_DIR):
    directory.mkdir(parents=True, exist_ok=True)


class VoxelizeRequest(BaseModel):
    stl_filename: str
    voxel_size: float
    project_name: str


@app.get("/api/hello")
def read_root():
    return {"message": "Hello from Python!"}


@app.get("/api/list-stl", response_model=list[str])
async def get_available_stl():
    '''
    Handles request to list all available STL files in the sample file directory.

    Args: None.

    Returns:
        files (list): filenames of all files in sample file directory.
    '''
    files = [entry.name for entry in MODEL_DIR.iterdir() if entry.is_file()]
    return files


@app.post("/api/upload-stl")
async def upload_stl_model(stl_file: UploadFile):
    '''
    Handles request to add an STL file into the sample file directory.

    Args:
        stl_file (UploadFile): The STL file to be added to the directory.

    Returns:
        (dict): Contains message reflecting status of the upload.
    '''
    try:
        with open(f"{MODEL_DIR}/{stl_file.filename}", "wb") as f:
            file_contents = await stl_file.read()
            f.write(file_contents)

        return {"message": f"STL file ({stl_file.filename}) uploaded successfully."}
    except Exception as e:
        return {"message": f"The following error occured whilst uploading STL file ({stl_file.filename}): {str(e)}"}


@app.get("/api/voxelize/list")
def list_voxelized_projects() -> dict[str, List[str]]:
    '''
    Lists all available voxelized project files.

    Returns:
        (dict): Contains list of available project filenames.
    '''
    projects = sorted(p.name for p in VOXEL_STORAGE_DIR.iterdir() if p.is_file())
    return {"projects": projects}


@app.get("/api/voxelize/")
async def get_voxelized(project_name: str):
    '''
    Handles request to retrieve voxelized project coordinates.

    Args:
        project_name (str): The name of the project file to read.

    Returns:
        (dict): Contains the coordinates array and metadata.
    '''
    project_path = VOXEL_STORAGE_DIR / project_name
    
    if not project_path.exists():
        # List available projects for better error message
        available = [p.name for p in VOXEL_STORAGE_DIR.iterdir() if p.is_file()]
        raise HTTPException(
            status_code=404, 
            detail=f"Project '{project_name}' not found. Available projects: {available if available else 'none'}"
        )
    
    try:
        coordinates = pj.read_surface(str(project_path))
        # Convert numpy array to list for JSON serialization
        coordinates_list = coordinates.tolist() if hasattr(coordinates, 'tolist') else coordinates
        
        return {
            "project_name": project_name,
            "coordinates": coordinates_list,
            "num_voxels": len(coordinates_list) if coordinates_list is not None else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading project: {str(e)}")


@app.post("/api/voxelize")
async def voxelize(request: VoxelizeRequest):
    '''
    Handles request to voxelize an STL file.

    Args:
        request (VoxelizeRequest): Request body containing:
            stl_filename (str): The name of the STL file within sample-stl-files to be voxelized.
            voxel_size (float): Scale of voxel to 1 unit (e.g. if 10 voxels per 1 unit, would = 0.1).
            project_name (str): Name of the project to create.

    Returns:
        (dict): Contains message reflecting status and the path to the resulting project file.
    '''
    stl_filename = request.stl_filename
    voxel_size = request.voxel_size
    project_name = request.project_name
    
    stl_path = MODEL_DIR / stl_filename

    if not stl_path.exists():
        raise HTTPException(status_code=404, detail=f"Filename {stl_filename} not found on server!")

    with stl_path.open("rb") as file:
        # load passed stl file as a mesh
        mesh = ms.create_mesh(file, file_type='stl')

        #TODO: scale the mesh in (x, y, z)

        # voxelize the mesh and fill inside with voxels
        voxelized = vx.voxelize(mesh, voxel_size)

        # get all coordinates of voxels (centers of each voxel)
        points = vx.get_voxel_coordinates(voxelized)

        # save points as csv to project file with init magnetization vector and material IDs
        # FOR POC: this will be in backend/sample-project-files
        #filepath = pj.create_project(points, project_name, str(VOXEL_STORAGE_DIR))
        
        origin = voxelized.translation
        filepath = pj.create_json(points, project_name, str(VOXEL_STORAGE_DIR), origin, voxel_size)



        return {"message": f"Voxelization Status of STL file ({stl_filename}): Success", "projectpath": f"{filepath}"}


@app.get("/api/models")
def list_models() -> dict[str, List[str]]:
    models = sorted(p.name for p in MODEL_DIR.glob("*.stl"))
    return {"models": models}


def _resolve_model_path(filename: str) -> Path:
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


@app.get("/api/models/{filename}")
def get_model(filename: str):
    file_path = _resolve_model_path(filename)
    return FileResponse(
        path=file_path,
        media_type="model/stl",
        filename=file_path.name,
    )


@app.get("/api/models/sphere")
def get_sphere_model():
    return get_model("sphere.stl")


@app.get("/api/voxelize/download/{project_name}")
def download_voxel_csv(project_name: str):
    '''
    Handles request to download a voxelized project file as CSV.

    Args:
        project_name (str): The name of the project file to download.

    Returns:
        (FileResponse): The CSV file containing voxel coordinates.
    '''
    project_path = VOXEL_STORAGE_DIR / project_name
    
    if not project_path.exists():
        available = [p.name for p in VOXEL_STORAGE_DIR.iterdir() if p.is_file()]
        raise HTTPException(
            status_code=404, 
            detail=f"Project '{project_name}' not found. Available projects: {available if available else 'none'}"
        )
    
    return FileResponse(
        path=project_path,
        media_type="text/csv",
        filename=f"{project_name}.csv",
    )






