import trimesh

def create_mesh(file, file_type: str):
    mesh = trimesh.load_mesh(file_obj = file, file_type=file_type)
    return mesh

def scale_mesh(mesh, scale_x: float, scale_y: float, scale_z: float):
    #NOT IMPLEMENTED!
    pass