from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent
SAMPLE_DIR = BACKEND_DIR / "sample-project-files"
STL_STORAGE_DIR = SAMPLE_DIR / "stl"
VOXEL_STORAGE_DIR = SAMPLE_DIR / "voxels"
MODEL_DIR = STL_STORAGE_DIR  # Alias for compatibility with contributor's code

CORS_ORIGINS = ["http://localhost:5173"]
CORS_CREDENTIALS = True
CORS_METHODS = ["*"]
CORS_HEADERS = ["*"]

for directory in (STL_STORAGE_DIR, VOXEL_STORAGE_DIR):
    directory.mkdir(parents=True, exist_ok=True)
