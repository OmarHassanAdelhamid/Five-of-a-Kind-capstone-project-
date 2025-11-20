import numpy as np
import os

def create_project(coordinates: np.array, filename: str, path: str):
    project_path = os.path.join(path, filename)

    with open(project_path, "w") as file:
        for coord in coordinates:
            proj_line = f"{coord[0]},{coord[1]},{coord[2]},1,0,0\n" #magnetization magnitude, angle, ID
            file.write(proj_line)
    
    return project_path

def read_project_coordinates(filepath: str):
    coordinates = None
    with open(filepath, "r") as file:
        lines = file.readlines()
        num_voxels = len(lines)
        if num_voxels == 0:
            return np.empty((0, 3))
        
        coordinates = np.empty((num_voxels, 3))

        for i, line in enumerate(lines):
            voxel_data = line.strip().split(',')
            if len(voxel_data) >= 3:
                coordinates[i] = [float(voxel_data[0]), float(voxel_data[1]), float(voxel_data[2])]
    
    return coordinates

