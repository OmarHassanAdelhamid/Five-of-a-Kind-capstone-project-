"""
Routes for layer management (Display Partitioning Module - M3).
"""

from typing import Optional
from fastapi import APIRouter, HTTPException

from app.config import VOXEL_STORAGE_DIR
from app.models.schemas import UpdateLayerRequest
import app.services.project_manager as pm
import app.services.model_structure as ms
import numpy as np

router = APIRouter(prefix="/api/layers", tags=["layers"])

@router.get("/{project_name}")
async def get_layers(project_name: str, axis: Optional[str] = "z"):
    if axis not in ("z", "x", "y"):
        raise HTTPException(status_code=400, detail="axis must be 'z', 'x', or 'y'")
    project_path = VOXEL_STORAGE_DIR / project_name

    if not project_path.exists():
        available = [p.name for p in VOXEL_STORAGE_DIR.iterdir() if p.is_file()]
        raise HTTPException(
            status_code=404,
            detail=f"Project '{project_name}' not found. Available projects: {available if available else 'none'}"
        )

    try:
        if axis == "x":
            layers = ms.x_directory(str(project_path))
        elif axis == "y":
            layers = ms.y_directory(str(project_path))
        else:
            layers = ms.z_directory(str(project_path))

        layer_indices = [int(l[0]) for l in layers]
        return {
            "project_name": project_name,
            "num_layers": len(layer_indices),
            "layers": layer_indices,
            "axis": axis,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading layer: {str(e)}")

@router.get("/{project_name}/{layer_value}")
async def get_layer(project_name: str, layer_index: int, axis: Optional[str] = "z"):
    if axis not in ("z", "x", "y"):
        raise HTTPException(status_code=400, detail="axis must be 'z', 'x', or 'y'")

    project_path = VOXEL_STORAGE_DIR / project_name
    try:
        if axis == "x":
            voxels = ms.get_x_layer(layer_index, project_path)
        elif axis == "y":
            voxels = ms.get_y_layer(layer_index, project_path)
        else:
            voxels = ms.get_z_layer(layer_index, project_path)

        if not voxels:
            raise HTTPException(
                status_code=404,
                detail=f"Layer at {axis.upper()}={layer_index} not found."
            )
        return {
            "project_name": project_name,
            "layer_index": layer_index,
            "num_voxels": len(voxels),
            "voxels": voxels,
            "axis": axis,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading layer: {str(e)}")


'''
NOTE: STILL NEEDS TO BE FIXED

@router.post("/update")
async def update_layer(request: UpdateLayerRequest):
    project_path = VOXEL_STORAGE_DIR / request.project_name
    
    if not project_path.exists():
        available = [p.name for p in VOXEL_STORAGE_DIR.iterdir() if p.is_file()]
        raise HTTPException(
            status_code=404, 
            detail=f"Project '{request.project_name}' not found. Available projects: {available if available else 'none'}"
        )
    
    try:
        project_data = pj.read_project_full_data(str(project_path))
        
        new_layer_voxels = np.array(request.voxels)
        
        if len(new_layer_voxels.shape) == 1:
            new_layer_voxels = new_layer_voxels.reshape(1, -1)
        
        if new_layer_voxels.shape[1] < 6:
            padding = np.zeros((new_layer_voxels.shape[0], 6 - new_layer_voxels.shape[1]))
            new_layer_voxels = np.hstack([new_layer_voxels, padding])
        
        ax = request.axis if request.axis in ("z", "x", "y") else "z"
        updated_data = pj.update_layer_in_project(
            project_data,
            request.layer_value,
            new_layer_voxels,
            request.voxel_size,
            axis=ax,
        )
        pj.write_project_full_data(updated_data, str(project_path))
        return {
            "message": f"Layer at {ax.upper()}={request.layer_value} updated successfully",
            "project_name": request.project_name,
            "num_voxels": len(updated_data),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating layer: {str(e)}")
'''