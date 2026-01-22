
from pydantic import BaseModel


class VoxelizeRequest(BaseModel):
    stl_filename: str
    voxel_size: float
    project_name: str
