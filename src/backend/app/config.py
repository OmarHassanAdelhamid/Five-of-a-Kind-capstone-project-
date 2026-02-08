from pathlib import Path
import os

BACKEND_DIR = Path(__file__).parent.parent
SAMPLE_DIR = BACKEND_DIR / "sample-project-files"
STL_STORAGE_DIR = SAMPLE_DIR / "stl"                 # directory for stl files uploaded to server
PROJECT_STORAGE_DIR = SAMPLE_DIR / "voxels"          # directory for project folders on server

# Allow all localhost origins in development
# In production, set specific origins via environment variable
CORS_ORIGINS_ENV = os.getenv("CORS_ORIGINS")
if CORS_ORIGINS_ENV:
    CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_ENV.split(",")]
else:
    # Development: allow common localhost ports
    # Add more ports as needed
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
    ]

CORS_CREDENTIALS = True
CORS_METHODS = ["*"]
CORS_HEADERS = ["*"]

for directory in (STL_STORAGE_DIR, PROJECT_STORAGE_DIR):
    directory.mkdir(parents=True, exist_ok=True)
