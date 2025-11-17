# pyright: reportMissingImports=false

"""
FastAPI application entry point.
"""

from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import app.services.mesh_service as ms
import app.services.voxel_service as vx
import app.services.project_service as pj
import os
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
MODEL_DIR = BACKEND_DIR / "sample-stl-files"

# Ensure MODEL_DIR exists
MODEL_DIR.mkdir(parents=True, exist_ok=True)


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
        file_path = MODEL_DIR / stl_file.filename
        file_contents = await stl_file.read()
        file_path.write_bytes(file_contents)

        return {"message": f"STL file ({stl_file.filename}) uploaded successfully."}
    except Exception as e:
        return {"message": f"The following error occured whilst uploading STL file ({stl_file.filename}): {str(e)}"}

@app.post("/api/voxelize")
async def voxelize(stl_filename: str, voxel_size: float, project_name: str):
    '''
    Handles request to voxelize an STL file.

    Args:
        stl_filename (str): The name of the STL file within sample-stl-files to be voxelized.
        voxel_size (float): Scale of voxel to 1 unit (e.g. if 10 voxels per 1 unit, would = 0.1).

    Returns:
        (dict): Contains message reflecting status and the path to the resulting project file.
    '''
    stl_path = MODEL_DIR / stl_filename

    if not stl_path.exists():
        raise HTTPException(status_code=404, detail=f"Filename {stl_filename} not found on server!")

    with stl_path.open("r") as file:
        # load passed stl file as a mesh
        mesh = ms.create_mesh(file, file_type='stl')

        #TODO: scale the mesh in (x, y, z)

        # voxelize the mesh and fill inside with voxels
        voxelized = vx.voxelize(mesh, voxel_size)

        # get all coordinates of voxels (centers of each voxel)
        points = vx.get_voxel_coordinates(voxelized)

        # save points as csv to project file with init magnetization vector and material IDs
        # FOR POC: this will be in backend/sample-project-files
        #TODO: update this to use pathlib and MODEL_DIR
        parent_dir = os.path.abspath(os.path.join(os.getcwd(), "/..")) #check this.
        project_folder = os.path.join(parent_dir, "/sample-project-files")
        filepath = pj.create_project(points, project_name, project_folder)

        return {"message": f"Voxelization Status of STL file ({stl_filename}): Success", "projectpath": f"{filepath}"}


@app.get("/api/models/sphere")
def get_sphere_model():
    """Return the sample sphere STL model."""
    file_path = MODEL_DIR / "sphere.stl"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="sphere.stl not found on server")

    return FileResponse(
        path=file_path,
        media_type="model/stl",
        filename="sphere.stl",
    )






