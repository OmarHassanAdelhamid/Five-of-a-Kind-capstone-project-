# pyright: reportMissingImports=false

"""
FastAPI application entry point.
"""


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS, CORS_CREDENTIALS, CORS_METHODS, CORS_HEADERS

from fastapi import Request
from fastapi.responses import PlainTextResponse
import traceback

from app.routers import stl_router, project_router, edit_router, export_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=CORS_CREDENTIALS,
    allow_methods=CORS_METHODS,
    allow_headers=CORS_HEADERS,
)

app.include_router(stl_router.router)
app.include_router(project_router.router)
app.include_router(edit_router.router)
app.include_router(export_router.router)

