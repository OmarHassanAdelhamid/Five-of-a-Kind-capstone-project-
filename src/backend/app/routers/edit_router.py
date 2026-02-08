"""
Routes for layer management and voxel updates.
"""


from typing import Optional
from fastapi import APIRouter, HTTPException

from app.config import PROJECT_STORAGE_DIR
from app.models.schemas import RetrieveLayerRequest, LayerAxis, UpdateVoxelsRequest, UpdateAction, HistoryAction, ModelDelta, UpdateHistoryRequest

import app.services.model_editing_service as em
import app.services.model_tracking_service as mt
import app.services.history_management_service as hm

router = APIRouter(prefix="/api/edit", tags=["edit"])

@router.post("/retrieve")
async def get_layer(request: RetrieveLayerRequest):
    """
    Handles request to retrieve all voxels within a layer, for the layer editing interface.

    Args:
        request (RetrieveLayerRequest): Request containing a layer index and which axis it refers to.
            See doc within schemas.py for more details.

    Returns:
        (dict): Contains message reflecting the relevant voxels, and associated information passed in initially.
    """
    if request.axis not in (LayerAxis.Z, LayerAxis.X, LayerAxis.Y):
        raise HTTPException(status_code=400, detail="Invalid request; axis must be 'z', 'x', or 'y'")

    project_path = PROJECT_STORAGE_DIR / request.project_name

    if not project_path.exists():
        available = [p.name for p in PROJECT_STORAGE_DIR.iterdir() if p.is_dir()]
        raise HTTPException(
            status_code=404, 
            detail=f"Project '{request.project_name}' not found. Available projects: {available if available else 'none'}"
        )
    
    partition_path = project_path / request.partition_name

    if not partition_path.exists():
        available = [p.name for p in project_path.iterdir() if p.is_file()]
        raise HTTPException(
            status_code=404,
            detail=f"Partition '{request.partition_name}' not found within project '{request.project_name}'. Available partitions: {available if available else 'none'}"
        )

    try:
        # Get all voxels from corresponding layer.
        if request.axis == "x":
            voxels = mt.get_x_layer(request.layer_index, partition_path)
        elif request.axis == "y":
            voxels = mt.get_y_layer(request.layer_index, partition_path)
        else:
            voxels = mt.get_z_layer(request.layer_index, partition_path)

        if not voxels:
            # Invalid layer.
            raise HTTPException(
                status_code=404,
                detail=f"Layer at {request.axis.upper()}={request.layer_index} not found."
            )
        
        return {
            "project_name": request.project_name,
            "partition_name": request.partition_name,
            "layer_index": request.layer_index,
            "num_voxels": len(voxels),
            "voxels": voxels,
            "axis": request.axis,
        }
    
    except HTTPException as httpex:
        raise httpex
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading layer: {str(e)}")

@router.post("/update")
async def update_voxels(request: UpdateVoxelsRequest):
    """
    Handles request to update a set of voxels within a layer.
    
    Args:
        request (UpdateVoxelsRequest): Request containing a set of voxels and an action to take 
            with them. See doc within schemas.py for more details.

    Returns:
        (dict): Contains message reflecting status of update, the project name, and number of voxels updated.
    """

    project_path = PROJECT_STORAGE_DIR / request.project_name

    if not project_path.exists():
        available = [p.name for p in PROJECT_STORAGE_DIR.iterdir() if p.is_dir()]
        raise HTTPException(
            status_code=404, 
            detail=f"Project '{request.project_name}' not found. Available projects: {available if available else 'none'}"
        )
    
    partition_path = project_path / request.partition_name

    if not partition_path.exists():
        available = [p.name for p in project_path.iterdir() if p.is_file()]
        raise HTTPException(
            status_code=404,
            detail=f"Partition '{request.partition_name}' not found within project '{request.project_name}'. Available partitions: {available if available else 'none'}"
        )
    
    try:
        if (request.action == UpdateAction.UPDATE):
            old_voxels = mt.get_full_voxels(str(partition_path), request.voxels)  # record voxel state pre-update

            if (request.materialID != None and request.magnetization == None):
                # request is to set all voxels to the passed material.
                em.update_voxel_materials(partition_path, request.voxels, request.materialID)
            elif (request.materialID == None and request.magnetization != None):
                # request is to set all voxels to the passed magnetization.
                em.update_voxel_magnetization(partition_path, request.voxels, request.magnetization)
            elif (request.materialID != None and request.magnetization != None):
                # invalid request. only one can be updated in a single step.
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid request; UpdateAction was UPDATE, but both a materialID and magnetization were passed."
                )
            else:
                # invalid request. if both are None, there's nothing to update.
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid request; UpdateAction was UPDATE, but neither a materialID or magnetization was passed."
                )
            
            new_voxels = mt.get_full_voxels(str(partition_path), request.voxels)  # record voxel state post-update
            hm.record_change(ModelDelta(old_voxels=old_voxels, new_voxels=new_voxels))
            
        # elif (request.action == UpdateAction.RESET_MATERIAL):
        #     # request is to set material of all voxels to null.
        #     # TODO: no model structure method for this?
        #     pass
        # elif (request.action == UpdateAction.RESET_MAGNETIZATION):
        #     # request is to set magnetization of all voxels to null.
        #     # TODO: no model structure method for this?
        #     pass
        # #! move add/delete to a separate route.
        # elif (request.action == UpdateAction.ADD):
        #     # request is to add all voxels to the model.
        #     em.add_voxels(partition_path, request.voxels)
        # elif (request.action == UpdateAction.DELETE):
        #     #request is to delete all voxels from the model.
        #     em.delete_voxels(partition_path, request.voxels)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid update action code passed: {request.action}."
            )

        return {
            "message": f"Model updated successfully",
            "project_name": request.project_name,
            "partition_name": request.partition_name,
            "num_voxels": len(request.voxels),
        }
    
    except HTTPException as httpex:
        raise httpex
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating layer: {str(e)}")

@router.post("/history")
async def update_history(request: UpdateHistoryRequest):
    """
    Handles request to undo or redo a change to the model.

    Args:
        request (UpdateHistoryRequest): Request containing the model name, and an action indicating undo or redo.

    Returns:
        (dict): Contains message reflecting execution success, and the statuses of both the undo and redo stacks.
    """

    project_path = PROJECT_STORAGE_DIR / request.project_name

    if not project_path.exists():
        available = [p.name for p in PROJECT_STORAGE_DIR.iterdir() if p.is_dir()]
        raise HTTPException(
            status_code=404, 
            detail=f"Project '{request.project_name}' not found. Available projects: {available if available else 'none'}"
        )
    
    partition_path = project_path / request.partition_name

    if not partition_path.exists():
        available = [p.name for p in project_path.iterdir() if p.is_file()]
        raise HTTPException(
            status_code=404,
            detail=f"Partition '{request.partition_name}' not found within project '{request.project_name}'. Available partitions: {available if available else 'none'}"
        )
    
    try:
        if (request.action == HistoryAction.UNDO):
            # Get top of undo stack; voxels become old_voxels.
            print(f"Received undo request for project '{request.project_name}'. Checking undo stack...")
            change = hm.undo_request()
            print(f"Undoing change: {change}")
            em.update_voxel_properties(str(project_path),change.old_voxels)
            print(f"Undo applied successfully.")
        elif (request.action == HistoryAction.REDO):
            # Get top of redo stack; voxels become new_voxels.
            change = hm.redo_request()
            em.update_voxel_properties(str(project_path), change.new_voxels)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid history action code passed: {request.action}."
            )
        
        return {
            "message": f"{request.action} executed successfully",
            "undo_empty": str(hm.is_undo_empty()),
            "redo_empty": str(hm.is_redo_empty())
        }

    except hm.EmptyHistoryException as hist_ex:
        raise HTTPException(status_code=400, detail=f"Bad history request: {str(hist_ex)}")
    except HTTPException as httpex:
        raise httpex
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing history request: {str(e)}")


@router.get("/layers/{project_name}")
async def get_layers(project_name: str, partition_name: str, axis: Optional[str] = "z"):
    """
    Get list of available layer indices for a project.
    
    Args:
        project_name: Name of the project
        axis: Axis to get layers for ('x', 'y', or 'z')
    
    Returns:
        Dict with project_name, num_layers, layers (list of indices), and axis
    """
    if axis not in ("z", "x", "y"):
        raise HTTPException(status_code=400, detail="axis must be 'z', 'x', or 'y'")
    
    project_path = PROJECT_STORAGE_DIR / project_name

    if not project_path.exists():
        available = [p.name for p in PROJECT_STORAGE_DIR.iterdir() if p.is_dir()]
        raise HTTPException(
            status_code=404,
            detail=f"Project '{project_name}' not found. Available projects: {available if available else 'none'}"
        )
    
    partition_path = project_path / partition_name

    if not partition_path.exists():
        available = [p.name for p in project_path.iterdir() if p.is_file()]
        raise HTTPException(
            status_code=404,
            detail=f"Partition '{partition_name}' not found within project '{project_name}'. Available partitions: {available if available else 'none'}"
        )

    try:
        if axis == "x":
            layers = mt.x_directory(str(partition_path))
        elif axis == "y":
            layers = mt.y_directory(str(partition_path))
        else:
            layers = mt.z_directory(str(partition_path))

        # Each layer is now (index, coordinate_value)
        layer_info = [{"index": int(l[0]), "coordinate": float(l[1])} for l in layers]
        return {
            "project_name": project_name,
            "partition_name": partition_name,
            "num_layers": len(layer_info),
            "layers": layer_info,
            "axis": axis,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading layers: {str(e)}")

