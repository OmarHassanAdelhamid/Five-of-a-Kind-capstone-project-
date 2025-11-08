from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile
import app.services.mesh_service as ms
import app.services.voxel_service as vx
import app.services.project_service as pj
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/hello")
def read_root():
    return {"message": "Hello from Python!"}

@app.post("/api/voxelize")
async def voxelize(stl_file: UploadFile, voxel_size: float, project_name: str):
    '''
    Handles request to voxelize an STL file.

    Args:
        stl_file (UploadFile): The STL file to be voxelized.
        voxel_size (float): Scale of voxel to 1 unit (e.g. if 10 voxels per 1 unit, would = 0.1).

    Returns:
        (dict): Contains message reflecting status and the path to the resulting project file.
    '''
    # load passed stl file as a mesh
    mesh = ms.create_mesh(stl_file, file_type='stl')

    #TODO: scale the mesh in (x, y, z)

    # voxelize the mesh and fill inside with voxels
    voxelized = vx.voxelize(mesh, voxel_size)

    # get all coordinates of voxels (centers of each voxel)
    points = vx.get_voxel_coordinates(voxelized)

    # save points as csv to project file with init magnetization vector and material IDs
    # FOR POC: this will be in backend/sample-project-files
    parent_dir = os.path.abspath(os.path.join(os.getcwd(), "/..")) #check this.
    project_folder = os.path.join(parent_dir, "/sample-project-files")
    filepath = pj.create_project(points, project_name, project_folder)

    return {"message": "Voxelization Status: Success", "projectpath": f"{filepath}"}




