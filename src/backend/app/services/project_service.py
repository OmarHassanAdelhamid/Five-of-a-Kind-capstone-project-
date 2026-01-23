import numpy as np
import os
import json
from typing import Dict, List, Tuple


from collections import defaultdict

#new method to create JSON file 
def create_json(coordinates: np.array, filename: str, path: str, origin: np.ndarray, voxel_size):
    project_path = os.path.join(path, filename)
    layers = {}
    ox, oy, oz = origin

    for x, y, z in coordinates:
        ix = round((x - ox) / voxel_size)
        iy = round((y - oy) / voxel_size)
        iz = round((z - oz) / voxel_size)

        layer_key = f"L:{iz}"
        voxel_key = f"V:{ix},{iy},{iz}"

        if layer_key not in layers:
            layers[layer_key] = {"voxels": {}}

        layers[layer_key]["voxels"][voxel_key] = {
            "x": x,
            "y": y,
            "z": z,
            "magnetization": 1,
            "angle": 0,
            "id": 0
        }

    layer_order = sorted(layers.keys(), key=lambda k: int(k.split(":")[1]))
    data = {
        "layers": layers,
        "layer_order": layer_order
    }

    with open(project_path, "w") as f:
        json.dump(data, f, indent=2, sort_keys=True)
    return project_path

#create a list of all voxels with integer coordinates
def get_voxels_int(layers: dict) -> set[tuple[int, int, int]]:
    voxel_coords = set()
    for layer in layers.values():
        for vkey in layer["voxels"].keys():
            ix, iy, iz = map(int, vkey.split(":")[1].split(","))
            voxel_coords.add((ix, iy, iz))
    return voxel_coords

#determine outer perimeter of surface
def get_surface(occupied: set[tuple[int, int, int]]) -> set[tuple[int, int, int]]:
    directions = [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]

    surface_voxels = set()
    for x, y, z in occupied:
        for dx, dy, dz in directions:
            if (x + dx, y + dy, z + dz) not in occupied:
                surface_voxels.add((x, y, z))
                break
    return surface_voxels

#new method to read JSON file + only read surface voxels
def read_surface(filepath: str):
    with open(filepath, "r") as file:
        data = json.load(file)

    layers = data["layers"]
    perimeter_coords = []
    all_voxels = get_voxels_int(layers)
    surface = get_surface(all_voxels)

    for ix, iy, iz in surface:
        layer_key = f"L:{iz}"
        voxel_key = f"V:{ix},{iy},{iz}"
        layer = data["layers"][layer_key]
        voxel = layer["voxels"][voxel_key]
        perimeter_coords.append([voxel["x"], voxel["y"], voxel["z"]])

    return np.array(perimeter_coords) if perimeter_coords else np.empty((0, 3), dtype=int)

def organize_voxels_into_layers(
    voxel_data: np.ndarray,
    voxel_size: float = None,
    axis: str = "z",
) -> Dict[float, np.ndarray]:
    if len(voxel_data) == 0:
        return {}
    col = 0 if axis == "x" else 1 if axis == "y" else 2
    _precision = 12
    layers: Dict[float, list] = {}
    for voxel in voxel_data:
        v = round(float(voxel[col]), _precision)
        if v not in layers:
            layers[v] = []
        layers[v].append(voxel)
    return {k: np.array(layers[k]) for k in sorted(layers.keys())}

def get_layer_info(layers: Dict[float, np.ndarray]) -> List[Dict]:
    layer_info = []
    for layer_value, voxels in layers.items():
        layer_info.append({
            "layer_value": float(layer_value),
            "num_voxels": len(voxels)
        })
    return layer_info

def update_layer_in_project(
    project_data: np.ndarray,
    layer_value: float,
    new_layer_voxels: np.ndarray,
    voxel_size: float = None,
    axis: str = "z",
) -> np.ndarray:
    if len(project_data) == 0:
        return new_layer_voxels
    col = 0 if axis == "x" else 1 if axis == "y" else 2
    _precision = 12
    layer_rounded = round(layer_value, _precision)
    voxel_vals = np.array([round(float(v), _precision) for v in project_data[:, col]])
    mask = np.abs(voxel_vals - layer_rounded) > 1e-9
    other_voxels = project_data[mask]
    
    if len(new_layer_voxels) > 0:
        updated_data = np.vstack([other_voxels, new_layer_voxels])
    else:
        updated_data = other_voxels
    
    return updated_data

def read_project_full_data(filepath: str) -> np.ndarray:
    with open(filepath, "r") as file:
        first_char = file.read(1)
        file.seek(0)
        
        if first_char == '{':
            data = json.load(file)
            layers = data.get("layers", {})
            voxels_list = []
            
            for layer_key, layer_data in layers.items():
                voxels = layer_data.get("voxels", {})
                for voxel_key, voxel in voxels.items():
                    x = float(voxel.get("x", 0.0))
                    y = float(voxel.get("y", 0.0))
                    z = float(voxel.get("z", 0.0))
                    mag = float(voxel.get("magnetization", 1.0))
                    angle = float(voxel.get("angle", 0.0))
                    voxel_id = float(voxel.get("id", 0.0))
                    voxels_list.append([x, y, z, mag, angle, voxel_id])
            
            if len(voxels_list) == 0:
                return np.empty((0, 6))
            return np.array(voxels_list)
        else:
            lines = file.readlines()
            num_voxels = len(lines)
            if num_voxels == 0:
                return np.empty((0, 6))
            
            voxel_data = np.empty((num_voxels, 6))
            
            for i, line in enumerate(lines):
                data = line.strip().split(',')
                x = float(data[0]) if len(data) > 0 else 0.0
                y = float(data[1]) if len(data) > 1 else 0.0
                z = float(data[2]) if len(data) > 2 else 0.0
                mag = float(data[3]) if len(data) > 3 else 1.0
                angle = float(data[4]) if len(data) > 4 else 0.0
                voxel_id = float(data[5]) if len(data) > 5 else 0.0
                
                voxel_data[i] = [x, y, z, mag, angle, voxel_id]
            
            return voxel_data

def write_project_full_data(voxel_data: np.ndarray, filepath: str, origin: np.ndarray = None, voxel_size: float = None):
    if len(voxel_data) == 0:
        data = {
            "layers": {},
            "layer_order": []
        }
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2, sort_keys=True)
        return
    
    layers = {}
    
    if origin is not None and voxel_size is not None:
        ox, oy, oz = origin
        for voxel in voxel_data:
            x, y, z = float(voxel[0]), float(voxel[1]), float(voxel[2])
            mag = float(voxel[3]) if len(voxel) > 3 else 1.0
            angle = float(voxel[4]) if len(voxel) > 4 else 0.0
            voxel_id = float(voxel[5]) if len(voxel) > 5 else 0.0
            
            ix = round((x - ox) / voxel_size)
            iy = round((y - oy) / voxel_size)
            iz = round((z - oz) / voxel_size)
            
            layer_key = f"L:{iz}"
            voxel_key = f"V:{ix},{iy},{iz}"
            
            if layer_key not in layers:
                layers[layer_key] = {"voxels": {}}
            
            layers[layer_key]["voxels"][voxel_key] = {
                "x": x,
                "y": y,
                "z": z,
                "magnetization": mag,
                "angle": angle,
                "id": voxel_id
            }
    else:
        for voxel in voxel_data:
            x, y, z = float(voxel[0]), float(voxel[1]), float(voxel[2])
            mag = float(voxel[3]) if len(voxel) > 3 else 1.0
            angle = float(voxel[4]) if len(voxel) > 4 else 0.0
            voxel_id = float(voxel[5]) if len(voxel) > 5 else 0.0
            
            iz = int(round(z))
            layer_key = f"L:{iz}"
            voxel_key = f"V:{x},{y},{z}"
            
            if layer_key not in layers:
                layers[layer_key] = {"voxels": {}}
            
            layers[layer_key]["voxels"][voxel_key] = {
                "x": x,
                "y": y,
                "z": z,
                "magnetization": mag,
                "angle": angle,
                "id": voxel_id
            }
    
    layer_order = sorted(layers.keys(), key=lambda k: int(k.split(":")[1]))
    data = {
        "layers": layers,
        "layer_order": layer_order
    }
    
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2, sort_keys=True)