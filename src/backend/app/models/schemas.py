from typing import List, Tuple, Optional
from pydantic import BaseModel
from enum import Enum

class UpdateAction(str, Enum):
    """
    Enum used to represent possible actions given a set of voxels.
    """
    UPDATE = "update"
    RESET_MATERIAL = "reset_material"
    RESET_MAGNETIZATION = "reset_magnetization"
    ADD = "add"
    DELETE = "delete"

class LayerAxis(str, Enum):
    """
    Enum used to represent each axis.
    """
    X = "x"
    Y = "y"
    Z = "z"

class VoxelizeRequest(BaseModel):
    """
    Datatype to represent a voxelization request.
    
    Args:
        stl_filename (str): filename of the stl to be voxelized.
        voxel_size (float): size of the voxel relative to 1 unit.
        project_name (str): name of the file the voxel database should be created in.
    """
    stl_filename: str
    voxel_size: float
    project_name: str

class RetrieveLayerRequest(BaseModel):
    """
    Datatype to represent a layer retrieval request.

    Args:
        project_name (str): name of the file the voxel database is saved in.
        layer_index (int): integer coordinate of the layer.
        axix (Optional[LayerAxis]): the axis the layer to be returned is parallel to. Defaults to Z.
    """
    project_name: str
    layer_index: int
    axis: Optional[LayerAxis] = LayerAxis.Z

class UpdateVoxelsRequest(BaseModel):
    """
    Datatype to represent a request to update a set of voxels.

    Args:
        project_name (str): name of the file the voxel database is saved in.
        voxels (List[Tuple[int, int, int]]): the set of voxels to be acted upon.
        action (UpdateAction): an action to take upon voxels.
        materialID (Optional[int]): if action is UPDATE, the material to be assigned to voxels.
        magnetization (Optional[Tuple[float, float, float]]): if action is UPDATE, the magnetization to be assigned to voxels.

    Notes:
        If the action is UPDATE, *only* one of materialID and magnetization can have a value!
        If both have a value or neither do, the request is considered invalid!
    """
    project_name: str
    voxels: List[Tuple[int, int, int]]
    action: UpdateAction
    materialID: Optional[int] = None
    magnetization: Optional[Tuple[float, float, float]] = None

