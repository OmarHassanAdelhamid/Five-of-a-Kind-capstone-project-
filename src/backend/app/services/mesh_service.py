import trimesh
from fastapi import APIRouter, HTTPException

def create_mesh(file, file_type: str):
    mesh = trimesh.load_mesh(file_obj = file, file_type=file_type)
    return mesh

def load_stl_mesh(stl_path: str, ):

    if not stl_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Filename {stl_path} not found on server!"
        )

    with stl_path.open("rb") as file:
        return create_mesh(file, file_type="stl")