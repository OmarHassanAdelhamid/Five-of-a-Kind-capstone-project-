import trimesh

def create_mesh(file, filetype: str):
    mesh = trimesh.load_mesh(file, filetype=filetype)
    return mesh

def scale_mesh(mesh, scale_x: float, scale_y: float, scale_z: float):
    #NOT IMPLEMENTED!
    pass