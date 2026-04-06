# pyright: reportMissingImports=false

"""
AutoVox API process: exposes HTTP routes for STL assets, voxel projects, editing, and export,
and wires CORS so the desktop or Vite dev UI can call the backend from localhost.

Course / submission fill-ins:
    @author Daniel Maurer, Khalid Farag, Andrew Bovbel
    @lastModified TODO: 2026/02/08

"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS, CORS_CREDENTIALS, CORS_METHODS, CORS_HEADERS

from fastapi import Request
from fastapi.responses import PlainTextResponse
import traceback

from app.routers import stl_router, project_router, edit_router, export_router

app = FastAPI()

# Cross-origin rules for browser clients (dev defaults; production can override via env in config).
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):.*",  # Allow any localhost port
    allow_credentials=CORS_CREDENTIALS,
    allow_methods=CORS_METHODS,
    allow_headers=CORS_HEADERS,
)

# HTTP surface area: sample STLs, project lifecycle, layer edits, CSV export.
app.include_router(stl_router.router)
app.include_router(project_router.router)
app.include_router(edit_router.router)
app.include_router(export_router.router)

