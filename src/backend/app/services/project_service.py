import numpy as np
import os

def create_project(coordinates: np.array, filename: str, path: str):
    project_path = os.path.join(path, filename)

    with open(project_path, "w") as file:
        for coord in coordinates:
            proj_line = f"{coord[0]},{coord[1]},{coord[2]},0,0,0\n"
            file.write(proj_line)
    
    return project_path

def read_project_coordinates(filepath: str):
    coordinates = None
    with open(filepath, "r") as file:
        num_voxels = sum(1 for _ in file)
        coordinates = np.empty(num_voxels, 3)

        for line, i in zip(file, coordinates.shape[0]):
            voxel_data = line.split(',')
            coordinates[i] = [voxel_data[0], voxel_data[1], voxel_data[2]]
    
    return coordinates

