# pyright: reportMissingImports=false

"""
FastAPI application entry point.
"""



from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS, CORS_CREDENTIALS, CORS_METHODS, CORS_HEADERS
from app.routers import models, projects, layers

from fastapi import Request
from fastapi.responses import PlainTextResponse
import traceback


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=CORS_CREDENTIALS,
    allow_methods=CORS_METHODS,
    allow_headers=CORS_HEADERS,
)

app.include_router(models.router)
app.include_router(projects.router)
app.include_router(layers.router)