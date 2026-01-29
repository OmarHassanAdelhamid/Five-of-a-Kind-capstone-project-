"""
Routes for project management and voxelization.
"""

## save project should be in this file. 
## also -> possibly split this file into voxel related and project related? unsure.

from typing import List

from fastapi import APIRouter, HTTPException

import os

from app.config import MODEL_DIR, VOXEL_STORAGE_DIR
from app.models.schemas import VoxelizeRequest

import app.services.mesh_service as ms
import app.services.voxel_service as vx
import app.services.project_management_service as pm
import app.services.model_tracking_service as struct

router = APIRouter(prefix="/api/project", tags=["project"])

@router.get("/list")
def list_projects() -> dict[str, List[str]]:
    """
    Lists all available voxelized project files.

    Returns:
        (dict): Contains list of available project filenames.
    """
    projects = sorted(p.name for p in VOXEL_STORAGE_DIR.iterdir() if p.is_file())
    return {"projects": projects}


@router.get("")
async def get_surface_voxels(project_name: str):
    """
    Handles request to retrieve surface voxels of a project for rendering.

    Args:
        project_name (str): The name of the project file to read.

    Returns:
        (dict): Contains the coordinates array and metadata.
    """
    project_path = VOXEL_STORAGE_DIR / project_name
    
    if not project_path.exists():
        available = [p.name for p in VOXEL_STORAGE_DIR.iterdir() if p.is_file()]
        raise HTTPException(
            status_code=404, 
            detail=f"Project '{project_name}' not found. Available projects: {available if available else 'none'}"
        )
    
    try:
        rows = struct.find_surface(str(project_path))
        coordinates = pm.read_voxels(rows)
        coordinates_list = coordinates.tolist() if hasattr(coordinates, 'tolist') else coordinates
        
        return {
            "project_name": project_name,
            "coordinates": coordinates_list,
            "num_voxels": len(coordinates_list) if coordinates_list is not None else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading project: {str(e)}")

@router.post("")
async def voxelize_stl(request: VoxelizeRequest):
    """
    Handles request to voxelize an STL file.

    Args:
        request (VoxelizeRequest): Request body containing:
            stl_filename (str): The name of the STL file within sample-stl-files to be voxelized.
            voxel_size (float): Scale of voxel to 1 unit (e.g. if 10 voxels per 1 unit, would = 0.1).
            project_name (str): Name of the project to create.

    Returns:
        (dict): Contains message reflecting status and the path to the resulting project file.
    """
    stl_filename = request.stl_filename
    voxel_size = request.voxel_size
    project_name = request.project_name
    stl_path = MODEL_DIR / stl_filename

    if not stl_path.exists():
        raise HTTPException(status_code=404, detail=f"Filename {stl_filename} not found on server!")

    with stl_path.open("rb") as file:
        # load passed stl file as a mesh
        mesh = ms.create_mesh(file, file_type='stl')
        
        voxelized = vx.voxelize(mesh, voxel_size)

        # get all coordinates of voxels (centers of each voxel)
        points = vx.get_voxel_coordinates(voxelized)
        origin = voxelized.translation

        project_path = os.path.join(str(VOXEL_STORAGE_DIR), project_name) 

        pm.initialize_voxel_db(project_path, origin, voxel_size)
        pm.create_voxel_db(project_path, points)

        # save points as csv to project file with init magnetization vector and material IDs
        # FOR POC: this will be in backend/sample-project-files

        #filepath = pm.create_voxel_db(points, project_name, str(VOXEL_STORAGE_DIR), origin, voxel_size)
        return {"message": f"Voxelization Status of STL file ({stl_filename}): Success", "projectpath": f"{project_path}"}
    
