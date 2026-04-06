"""
Re-exports public model-layer symbols for convenient imports from ``app.models``.

Course / submission fill-ins:
    @author Khalid Farag
    @lastModified 2026/01/22

Repository history (earliest commit touching this file): 340a236 2026-01-22 Khalid Farag
Provenance: git log --follow -- src/backend/app/models/__init__.py
"""

from app.models.schemas import VoxelizeRequest

__all__ = ["VoxelizeRequest"]
