import numpy as np
import os
import json
from typing import Dict, List, Tuple
from collections import defaultdict
import sqlite3

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
        # Detect SQLite before opening as text (avoids utf-8 decode error)
    with open(filepath, "rb") as f:
        header = f.read(16)
    if len(header) >= 16 and header[:16] == b'SQLite format 3\x00':
        return _read_project_from_sqlite(filepath)

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
            

def get_layer_bounds(layer_voxels: np.ndarray, axis: str) -> dict:
    if len(layer_voxels) == 0:
        return {}
    # columns: 0=x, 1=y, 2=z
    if axis == "z":
        return {
            "grid_x_min": float(np.min(layer_voxels[:, 0])),
            "grid_x_max": float(np.max(layer_voxels[:, 0])),
            "grid_y_min": float(np.min(layer_voxels[:, 1])),
            "grid_y_max": float(np.max(layer_voxels[:, 1])),
        }
    if axis == "y":
        return {
            "grid_x_min": float(np.min(layer_voxels[:, 0])),
            "grid_x_max": float(np.max(layer_voxels[:, 0])),
            "grid_y_min": float(np.min(layer_voxels[:, 2])),
            "grid_y_max": float(np.max(layer_voxels[:, 2])),
        }
    # axis == "x"
    return {
        "grid_x_min": float(np.min(layer_voxels[:, 1])),
        "grid_x_max": float(np.max(layer_voxels[:, 1])),
        "grid_y_min": float(np.min(layer_voxels[:, 2])),
        "grid_y_max": float(np.max(layer_voxels[:, 2])),
    }
    if axis == "z":
        return ["x", "y"]
    if axis == "y":
        return ["x", "z"]
    return ["y", "z"]  # axis == "x"

def layer_voxels_to_display_voxels(layer_voxels: np.ndarray, axis: str) -> List[dict]:
    if len(layer_voxels) == 0:
        return []
    # columns: 0=x, 1=y, 2=z, 3=mag, 4=angle, 5=material
    if axis == "z":
        col_a, col_b = 0, 1  # grid_x = x, grid_y = y
    elif axis == "y":
        col_a, col_b = 0, 2  # grid_x = x, grid_y = z
    else:
        col_a, col_b = 1, 2  # grid_x = y, grid_y = z

    out = []
    for v in layer_voxels:
        out.append({
            "x": float(v[0]),
            "y": float(v[1]),
            "z": float(v[2]),
            "magnetization": float(v[3]),
            "angle": float(v[4]),
            "material": float(v[5]),
            "grid_x": float(v[col_a]),
            "grid_y": float(v[col_b]),
        })
    return out