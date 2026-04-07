# AutoVox backend

FastAPI service for STL ingestion, voxelization, partitioned voxel storage (SQLite), editing history, and CSV export. Used by the web UI (`src/frontend`) and bundled inside the desktop app (`src/app`).

## Layout

| Path | Role |
| ---- | ---- |
| `app/main.py` | Application entry; mounts routers |
| `app/routers/` | HTTP routes (`stl`, `project`, `edit`, `export`, …) |
| `app/services/` | Voxelization, partitions, editing, export, mesh helpers |
| `app/models/` | Pydantic schemas and domain models |
| `app/config.py` | Settings |
| `tests/` | pytest suites (`routers-tests`, `services-tests`) |
| `sample-project-files/` | Example STL files and voxel DBs for local testing |

## Run locally

From this directory:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API: `http://localhost:8000` · OpenAPI: `http://localhost:8000/docs`

## Tests

```bash
pytest
pytest --cov
```

Configuration: `pytest.ini`, `.coveragerc`.

## Related docs

- Root [README.md](../../README.md) — full stack overview  
- [INSTALL.md](../../INSTALL.md) — packaged app (embedded backend)
