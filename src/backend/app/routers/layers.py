"""
Routes for layer management (Display Partitioning Module - M3).
"""

from typing import Optional
from fastapi import APIRouter, HTTPException

from app.config import VOXEL_STORAGE_DIR
from app.models.schemas import UpdateLayerRequest
import app.services.project_service as pj
import app.services.project_manager as pm
import numpy as np

router = APIRouter(prefix="/api/layers", tags=["layers"])


@router.get("/{project_name}")
async def get_layers(
    project_name: str,
    voxel_size: Optional[float] = None,
    axis: Optional[str] = "z",
):
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
        voxel_data = pj.read_project_full_data(str(project_path))
        layers = pj.organize_voxels_into_layers(voxel_data, voxel_size, axis)
        layer_info = pj.get_layer_info(layers)
        return {
            "project_name": project_name,
            "num_layers": len(layers),
            "layers": layer_info,
            "axis": axis,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading layers: {str(e)}")


@router.get("/{project_name}/{layer_value}")
async def get_layer(
    project_name: str,
    layer_value: float,
    voxel_size: Optional[float] = None,
    axis: Optional[str] = "z",
):
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
        voxel_data = pj.read_project_full_data(str(project_path))
        layers = pj.organize_voxels_into_layers(voxel_data, voxel_size, axis)
        matching_layers = [k for k in layers.keys() if abs(k - layer_value) < 1e-9]
        if not matching_layers:
            raise HTTPException(
                status_code=404,
                detail=f"Layer at {axis.upper()}={layer_value} not found. Available: {sorted(layers.keys())}",
            )
        actual = matching_layers[0]
        layer_voxels = layers[actual]
        voxels_list = layer_voxels.tolist() if hasattr(layer_voxels, "tolist") else layer_voxels
        return {
            "project_name": project_name,
            "layer_value": float(actual),
            "num_voxels": len(layer_voxels),
            "voxels": voxels_list,
            "axis": axis,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading layer: {str(e)}")


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


@router.post("/{project_name}/save")
async def save_project(project_name: str):
    project_path = VOXEL_STORAGE_DIR / project_name
    
    if not project_path.exists():
        available = [p.name for p in VOXEL_STORAGE_DIR.iterdir() if p.is_file()]
        raise HTTPException(
            status_code=404, 
            detail=f"Project '{project_name}' not found. Available projects: {available if available else 'none'}"
        )
    
    try:
        project_data = pj.read_project_full_data(str(project_path))
        pj.write_project_full_data(project_data, str(project_path))
        
        return {
            "message": f"Project '{project_name}' saved successfully",
            "num_voxels": len(project_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving project: {str(e)}")
