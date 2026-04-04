import pytest
from pathlib import Path
from collections import Counter
from app.services.model_structure_service import VoxelDB
import app.services.model_tracking_service as mt
import app.services.model_editing_service as em

# Test setup
# Recreate all needed files:
# std_cube, cube_hollow, cube_x_hole, cube_y_hole, cube_z_hole, rect_prism, get_full

TEST_PATH = (Path(__file__).parent.parent / "test-files").resolve()
NAMES = ["test_std_cube", "test_cube_hollow", "test_cube_x_hole", 
         "test_cube_y_hole", "test_cube_z_hole", "test_rect_prism", "test_get_full"]

def _create_prism(lb_x, ub_x, lb_y, ub_y, lb_z, ub_z, opt):
    # helper to create prisms for testing.
    # lb/ub - lower and upper bounds for the prism (inclusive)
    ret_voxels = []
    for i in range(lb_x, ub_x+1):
        for j in range(lb_y, ub_y+1):
            for k in range(lb_z, ub_z+1):
                if opt == "full":
                    ret_voxels.append((i, j, k, float(i), float(j), float(k)))
                elif opt == "float":
                    ret_voxels.append((float(i), float(j), float(k)))
                elif opt == "int":
                    ret_voxels.append((i, j, k))

    return ret_voxels

for filename in NAMES:
    filepath = TEST_PATH / filename
    if filepath.exists(): filepath.unlink()
    
    with VoxelDB(filepath) as db: # recreate file.
        db.init_schema(1, (0.0, 0.0, 0.0))
        db.set_grid((0.0, 0.0, 0.0), 1.0)

        if filename == "test_std_cube":
            voxels = _create_prism(0, 3, 0, 3, 0, 3, "full")
        elif filename == "test_cube_hollow":
            voxels = _create_prism(0, 3, 0, 3, 0, 3, "full")
            v_del = _create_prism(1, 2, 1, 2, 1, 2, "full")
            for d in v_del:
                voxels.remove(d)
        elif filename == "test_cube_x_hole":
            voxels = _create_prism(0, 3, 0, 3, 0, 3, "full")
            v_del = _create_prism(0, 3, 1, 1, 1, 1, "full")
            for d in v_del:
                voxels.remove(d)
        elif filename == "test_cube_y_hole":
            voxels = _create_prism(0, 3, 0, 3, 0, 3, "full")
            v_del = _create_prism(1, 1, 0, 3, 1, 1, "full")
            for d in v_del:
                voxels.remove(d)
        elif filename == "test_cube_z_hole":
            voxels = _create_prism(0, 3, 0, 3, 0, 3, "full")
            v_del = _create_prism(1, 1, 1, 1, 0, 3, "full")
            for d in v_del:
                voxels.remove(d)
        elif filename == "test_rect_prism":
            voxels = _create_prism(-2, 2, 0, 3, -1, 0, "full")
            voxels.remove((2, 0, 0, 2.0, 0.0, 0.0))
            voxels.remove((2, 1, 0, 2.0, 1.0, 0.0)) # delete a corner.
        elif filename == "test_get_full":
            voxels = [(-1, -1, -1, -1.0, -1.0, -1.0),
                      (0, 0, 0, 0.0, 0.0, 0.0),
                      (1, 1, 1, 1.0, 1.0, 1.0)]

        db.upsert_many(voxels)
        db.commit()

def test_surface_solid_sphere() -> None:
    voxels = mt.find_surface(TEST_PATH / "test_std_cube")

    v_ret = _create_prism(0, 3, 0, 3, 0, 3, "float")
    v_del = _create_prism(1, 2, 1, 2, 1, 2, "float")
    for d in v_del:
        v_ret.remove(d)
    assert Counter(voxels) == Counter(v_ret)

def test_surface_hollow_sphere() -> None:
    voxels = mt.find_surface(TEST_PATH / "test_cube_hollow")

    v_ret = _create_prism(0, 3, 0, 3, 0, 3, "float")
    v_del = _create_prism(1, 2, 1, 2, 1, 2, "float")
    for d in v_del:
        v_ret.remove(d)
    assert Counter(voxels) == Counter(v_ret)

def test_surface_sphere_hole_x() -> None:
    voxels = mt.find_surface(TEST_PATH / "test_cube_x_hole")

    v_ret = _create_prism(0, 3, 0, 3, 0, 3, "float")
    v_del = _create_prism(0, 3, 1, 1, 1, 1, "float")
    for d in v_del:
        v_ret.remove(d)
    v_ret.remove((1.0, 2.0, 2.0))
    v_ret.remove((2.0, 2.0, 2.0))
    assert Counter(voxels) == Counter(v_ret)

def test_surface_sphere_hole_y() -> None:
    voxels = mt.find_surface(TEST_PATH / "test_cube_y_hole")

    v_ret = _create_prism(0, 3, 0, 3, 0, 3, "float")
    v_del = _create_prism(1, 1, 0, 3, 1, 1, "float")
    for d in v_del:
        v_ret.remove(d)
    v_ret.remove((2.0, 1.0, 2.0))
    v_ret.remove((2.0, 2.0, 2.0))
    assert Counter(voxels) == Counter(v_ret)

def test_surface_sphere_hole_z() -> None:
    voxels = mt.find_surface(TEST_PATH / "test_cube_z_hole")

    v_ret = _create_prism(0, 3, 0, 3, 0, 3, "float")
    v_del = _create_prism(1, 1, 1, 1, 0, 3, "float")
    for d in v_del:
        v_ret.remove(d)
    v_ret.remove((2.0, 2.0, 1.0))
    v_ret.remove((2.0, 2.0, 2.0))
    assert Counter(voxels) == Counter(v_ret)

def test_x_list_typical() -> None:
    x_dir = mt.x_directory(TEST_PATH / "test_rect_prism")
    assert Counter(x_dir) == Counter([(-2, -2.0), (-1, -1.0), (0, 0.0), (1, 1.0), (2, 2.0)])

def test_y_list_typical() -> None:
    y_dir = mt.y_directory(TEST_PATH / "test_rect_prism")
    assert Counter(y_dir) == Counter([(0, 0.0), (1, 1.0), (2, 2.0), (3, 3.0)])

def test_z_list_typical() -> None:
    z_dir = mt.z_directory(TEST_PATH / "test_rect_prism")
    assert Counter(z_dir) == Counter([(-1, -1.0), (0, 0.0)])

def test_get_x_layer_typical() -> None:
    x_layer = mt.get_x_layer(2, TEST_PATH / "test_rect_prism")
    assert Counter(x_layer) == Counter([(2, 0, -1, 2.0, 0.0, -1.0, 1, 0.0, 0.0),
                                        (2, 1, -1, 2.0, 1.0, -1.0, 1, 0.0, 0.0),
                                        (2, 2, -1, 2.0, 2.0, -1.0, 1, 0.0, 0.0),
                                        (2, 3, -1, 2.0, 3.0, -1.0, 1, 0.0, 0.0),
                                        (2, 2, 0, 2.0, 2.0, 0.0, 1, 0.0, 0.0),
                                        (2, 3, 0, 2.0, 3.0, 0.0, 1, 0.0, 0.0),])

def test_get_x_layer_non_existent_layer() -> None:
    x_layer = mt.get_x_layer(5, TEST_PATH / "test_rect_prism")
    assert x_layer == []

def test_get_y_layer_typical() -> None:
    y_layer = mt.get_y_layer(1, TEST_PATH / "test_rect_prism")
    assert Counter(y_layer) == Counter([(-2, 1, -1, -2.0, 1.0, -1.0, 1, 0.0, 0.0),
                                        (-1, 1, -1, -1.0, 1.0, -1.0, 1, 0.0, 0.0),
                                        (0, 1, -1, 0.0, 1.0, -1.0, 1, 0.0, 0.0),
                                        (1, 1, -1, 1.0, 1.0, -1.0, 1, 0.0, 0.0),
                                        (2, 1, -1, 2.0, 1.0, -1.0, 1, 0.0, 0.0),
                                        (-2, 1, 0, -2.0, 1.0, 0.0, 1, 0.0, 0.0),
                                        (-1, 1, 0, -1.0, 1.0, 0.0, 1, 0.0, 0.0),
                                        (0, 1, 0, 0.0, 1.0, 0.0, 1, 0.0, 0.0),
                                        (1, 1, 0, 1.0, 1.0, 0.0, 1, 0.0, 0.0)])

def test_get_y_layer_non_existent_layer() -> None:
    y_layer = mt.get_y_layer(5, TEST_PATH / "test_rect_prism")
    assert y_layer == []

def test_get_z_layer_typical() -> None:
    z_layer = mt.get_z_layer(0, TEST_PATH / "test_rect_prism")
    assert Counter(z_layer) == Counter([
        (-2, 0, 0, -2.0, 0.0, 0.0, 1, 0.0, 0.0),
        (-2, 1, 0, -2.0, 1.0, 0.0, 1, 0.0, 0.0),
        (-2, 2, 0, -2.0, 2.0, 0.0, 1, 0.0, 0.0),
        (-2, 3, 0, -2.0, 3.0, 0.0, 1, 0.0, 0.0),
        (-1, 0, 0, -1.0, 0.0, 0.0, 1, 0.0, 0.0),
        (-1, 1, 0, -1.0, 1.0, 0.0, 1, 0.0, 0.0),
        (-1, 2, 0, -1.0, 2.0, 0.0, 1, 0.0, 0.0),
        (-1, 3, 0, -1.0, 3.0, 0.0, 1, 0.0, 0.0),
        (0, 0, 0, 0.0, 0.0, 0.0, 1, 0.0, 0.0),
        (0, 1, 0, 0.0, 1.0, 0.0, 1, 0.0, 0.0),
        (0, 2, 0, 0.0, 2.0, 0.0, 1, 0.0, 0.0),
        (0, 3, 0, 0.0, 3.0, 0.0, 1, 0.0, 0.0),
        (1, 0, 0, 1.0, 0.0, 0.0, 1, 0.0, 0.0),
        (1, 1, 0, 1.0, 1.0, 0.0, 1, 0.0, 0.0),
        (1, 2, 0, 1.0, 2.0, 0.0, 1, 0.0, 0.0),
        (1, 3, 0, 1.0, 3.0, 0.0, 1, 0.0, 0.0),
        (2, 2, 0, 2.0, 2.0, 0.0, 1, 0.0, 0.0),
        (2, 3, 0, 2.0, 3.0, 0.0, 1, 0.0, 0.0),
    ])

def test_get_z_layer_non_existent_layer() -> None:
    z_layer = mt.get_z_layer(5, TEST_PATH / "test_rect_prism")
    assert z_layer == []

def test_get_full_voxels_typical() -> None:
    # update props first to ensure function is handling multiple props correctly
    # and not just returning defaults.
    em.update_voxel_properties(TEST_PATH / "test_get_full", [(-1, -1, -1, 30, 5.0, 40.0), 
                                                             (0, 0, 0, 3, 10.5, 10.6), 
                                                             (1, 1, 1, 4, 6.2, 3.0)])
    
    voxels = mt.get_full_voxels(TEST_PATH / "test_get_full", [(-1, -1, -1), (1, 1, 1)])
    assert Counter(voxels) == Counter([(-1, -1, -1, 30, 5.0, 40.0), (1, 1, 1, 4, 6.2, 3.0)])

def test_get_full_voxels_empty_list() -> None:
    voxels = mt.get_full_voxels(TEST_PATH / "test_get_full", [])
    assert voxels == []

