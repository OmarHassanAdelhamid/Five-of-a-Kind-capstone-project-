from typing import List, Optional
from pydantic import BaseModel


class VoxelizeRequest(BaseModel):
    stl_filename: str
    voxel_size: float
    project_name: str

class UpdateLayerRequest(BaseModel):
    project_name: str
    layer_value: float 
    voxels: List[List[float]]  
    voxel_size: Optional[float] = None
    axis: Optional[str] = "z" 
