"""
Pydantic request/response shapes and enums shared by FastAPI routers and services.

Course / submission fill-ins:
    @author Daniel Maurer, Olivia Reich, Khalid Farag
    @lastModified 2026/03/23

"""

from typing import List, Tuple, Optional, Literal
from pydantic import BaseModel
from enum import Enum

class UpdateAction(str, Enum):
    """Kinds of bulk edits the client may apply to selected voxels.

    Enum used to represent possible actions given a set of voxels.
    """
    UPDATE = "update"
    RESET_MATERIAL = "reset_material"
    RESET_MAGNETIZATION = "reset_magnetization"
    ADD = "add"
    DELETE = "delete"

class HistoryAction(str, Enum):
    """Undo or redo navigation over recorded model changes.

    Enum used to represent possible actions to model history.
    """
    UNDO = "undo"
    REDO = "redo"

class LayerAxis(str, Enum):
    """Which axis a layer slice is perpendicular to.

    Enum used to represent each axis.
    """
    X = "x"
    Y = "y"
    Z = "z"

class VoxelizeRequest(BaseModel):
    """Client input to turn a stored STL into a new voxel project with grid defaults and scaling.

    Datatype to represent a voxelization request.

    Args:
        stl_filename (str): filename of the stl to be voxelized.
        voxel_size (float): size of the voxel relative to 1 unit.
        default_material (Optional[int]): default value of material across partitions.
            if not provided, defaults to 1.
        default_magnet (Optional[Tuple[float, float, float]]): default value of magnetization across
            partitions. if not provided, defaults to [0, 0, 0].
        project_name (str): name of the file the voxel database should be created in.
    """
    stl_filename: str
    voxel_size: float
    default_material: Optional[int] = 1
    default_magnet: Optional[Tuple[float, float, float]] = [0.0, 0.0, 0.0]
    project_name: str
    model_units: Literal["µm", "mm", "cm"]
    scale_factor: float
    default_material: str

class RetrieveLayerRequest(BaseModel):
    """Which project partition and layer (by axis and index) the editor should load.

    Datatype to represent a layer retrieval request.

    Args:
        project_name (str): name of the file the voxel database is saved in.
        layer_index (int): integer coordinate of the layer.
        axix (Optional[LayerAxis]): the axis the layer to be returned is parallel to. Defaults to Z.
    """
    project_name: str
    partition_name: str
    layer_index: int
    axis: Optional[LayerAxis] = LayerAxis.Z

class UpdateVoxelsRequest(BaseModel):
    """Target voxels plus one edit action; UPDATE must set material XOR magnetization, not both nor neither.

    Datatype to represent a request to update a set of voxels.

    Args:
        project_name (str): name of the file the voxel database is saved in.
        voxels (List[Tuple[int, int, int]]): the set of voxels to be acted upon.
        action (UpdateAction): an action to take upon voxels.
        materialID (Optional[int]): if action is UPDATE, the material to be assigned to voxels.
        magnetization (Optional[Tuple[float, float]]): if action is UPDATE, the magnetization direction
            to be assigned to voxels as [polar (θ), azimuth (φ)] in degrees.

    Notes:
        If the action is UPDATE, *only* one of materialID and magnetization can have a value!
        If both have a value or neither do, the request is considered invalid!
    """
    project_name: str
    partition_name: str
    voxels: List[Tuple[int, int, int]]
    action: UpdateAction
    materialID: Optional[int] = None
    magnetization: Optional[Tuple[float, float]] = None

class UpdateHistoryRequest(BaseModel):
    """Apply the next undo or redo to the given project partition.

    Datatype to represent a request to undo or redo a model change.

    Args:
        project_name (str): name of the file the voxel database is saved in.
        action (HistoryAction): the action to be taken (undo or redo).
    """
    project_name: str
    partition_name: str
    action: HistoryAction

class ModelDelta(BaseModel):
    """Serializable before/after voxel property rows for the history stack (tuple layout matches DB fields).

    Datatype to represent a change to a model.

    Args:
        old_voxels (List[Tuple[int, int, int, int, float, float]]): set of voxels; what they were previously.
            Each tuple is (ix, iy, iz, material, magnet_polar, magnet_azimuth).
        new_voxels (List[Tuple[int, int, int, int, float, float]]): set of voxels; their new state.

    Notes:
        An empty list here is interpreted as either an addition (old = []) or deletion (new = []).
    """
    old_voxels: List[Tuple[int, int, int, int, float, float]]
    new_voxels: List[Tuple[int, int, int, int, float, float]]

