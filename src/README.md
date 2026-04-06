# AutoVox source (`src/`)

| Directory | Role |
| --------- | ---- |
| `frontend/` | React 19 + TypeScript + Vite. UI components (`components/`), API client and helpers (`utils/`). Run with `npm install` and `npm run dev` from `frontend/`. |
| `backend/` | FastAPI application. Entry point `app/main.py`; HTTP routers under `app/routers/`; domain logic under `app/services/`. Run with Uvicorn per the root [README.md](../README.md). |
| `app/` | Electron desktop wrapper. Bundles the built frontend and Python backend for distribution. See [INSTALL.md](../INSTALL.md) for `npm run pack` and development (`npm run dev`). |

Automated tests live next to each stack: Jest in `frontend/`, pytest in `backend/`.
