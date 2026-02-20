from typing import Optional, List
from dataclasses import dataclass

"""
Currently unused. At some point, should refactor to use these instead of list of tuples to standardize.
"""

@dataclass(init=False, frozen=True) 
class Voxel:
    """
    Datatype to represent an individual voxel outside of the database. Immutable as they are 
    only used as transient pieces of data passed between classes.

    Args:
        ix (int): x index in database/frontend
        iy (int): y index in database/frontend
        iz (int): z index in database/frontend
        x (float): x coordinate of voxel centre
        y (float): y coordinate of voxel centre
        z (float): z coordinate of voxel centre
        material (int): integer representing material; can be None in case that the voxel has no material
                        assigned.
        magnet_magnitude (float): magnitude of magnetization
        magnet_polar (float): polar angle of magnetization direction
        magnet_azimuth (float): azimuthal angle of magnetization direction
    """
    def __init__(self, ix: int, iy: int, iz: int,
                 x: float, y: float, z: float,
                 material: Optional[int] = None, 
                 magnet_magnitude: Optional[int] = None,
                 magnet_polar: Optional[int] = None,
                 magnet_azimuth: Optional[int] = None):
        """
        Create a new voxel object.
        """

        self.ix = ix
        self.iy = iy
        self.iz = iz
        self.x = x
        self.y = y
        self.z = z
        self.material = material

        if (magnet_magnitude != None and magnet_polar != None and magnet_azimuth != None) or (magnet_magnitude == None and magnet_polar == None and magnet_azimuth == None):
            # if all are included or all are None -> fine.
            self.magnet_magnitude = magnet_magnitude
            self.magnet_polar = magnet_polar
            self.magnet_azimuth = magnet_azimuth
        else:
            # incomplete magnetization!
            raise ValueError("Incomplete magnetization; either all magnetization values should be None, or all must be present.")


@dataclass(init=False, frozen=True)
class ModelDelta:
    """
    Datatype to represent a change to a model.

    Args:
        old_voxels (List[Voxels]): set of voxels; what they were previously.
        new_voxels (List[Voxels]): set of voxels; their new state.
    
    Notes: 
        An empty list here is interpreted as either an addition (old = []) or deletion (new = []).
    """
    def __init__(self, old_voxels: List[Voxel], new_voxels: List[Voxel]):
        """
        Create a new ModelDelta object.
        """

        self.old_voxels = old_voxels
        self.new_voxels = new_voxels
