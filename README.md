<div align="center">

# AutoVox

**Voxel-based multi-material 3D print design — automated.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org)
[![Three.js](https://img.shields.io/badge/Three.js-3D-black?logo=threedotjs&logoColor=white&style=flat-square)](https://threejs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white&style=flat-square)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## What is AutoVox?

AutoVox is a full-stack web application that **converts standard STL mesh files into editable voxel representations** — dramatically reducing the manual effort required to design multi-material 3D prints. Users can upload any `.stl` model, configure voxel resolution, interactively edit individual layers, assign materials, and export the final voxel data for printing.

> Built as a McMaster University Engineering capstone project (4G06), September 2025 – April 2026.

---

## macOS desktop app (download)

Pre-built **Apple Silicon (ARM64)** disk image (the file is stored with **Git LFS**; the plain `/raw/` URL only shows a tiny pointer, not the installer).

1. Open **[`Autovox-0.1.0-arm64.dmg` on GitHub](https://github.com/OmarHassanAdelhamid/Five-of-a-Kind-capstone-project-/blob/main/src/app/release/Autovox-0.1.0-arm64.dmg)**.
2. Click **Download raw file** (or the **⋯** menu → **Download**) — that downloads the real ~109 MB disk image.

To get the DMG with Git instead: `git lfs install`, clone the repo, then `git lfs pull` (or clone with LFS enabled so `src/app/release/*.dmg` is fetched automatically).

1. Open the DMG, drag **Autovox** into **Applications**, then launch it from there.
2. The build is **not Apple-notarized**; if macOS blocks it, open **System Settings → Privacy & Security** and choose to open it anyway.
3. On **first run**, the app may ask for **Python 3.9+** (or use the setup flow) so it can create a local environment and install the bundled FastAPI backend.

To produce a fresh DMG from source, see `src/app/package.json` (`npm run pack` from `src/app` after installing dependencies).

---

## Features

- **STL Import** — Upload any `.stl` file and automatically voxelize the mesh at a configurable resolution
- **3D Viewer** — Real-time Three.js rendering of the voxelized model with pan, zoom, and rotate controls
- **Layer Editor** — Slice the model along any axis (X/Y/Z) and edit individual voxels in an interactive 2D grid
- **Multi-Material Support** — Assign different materials to voxel partitions for multi-material print planning
- **Edit History & Undo** — Full undo/redo stack for non-destructive editing
- **CSV Export** — Download voxel data as structured CSV for downstream tooling or slicers
- **Project Management** — Save, reload, and manage multiple voxel projects independently

---

## Tech Stack

| Layer             | Technology                                                           |
| ----------------- | -------------------------------------------------------------------- |
| **Frontend**      | React 19, TypeScript, Vite 7                                         |
| **3D Rendering**  | Three.js                                                             |
| **Backend**       | Python, FastAPI, Uvicorn                                             |
| **3D Processing** | trimesh, NumPy                                                       |
| **Storage**       | Filesystem (STL/project files), SQLite (voxel partitions)            |
| **Testing**       | Jest + Testing Library (frontend), pytest + pytest-asyncio (backend) |
| **CI**            | GitHub Actions (lint, test, LaTeX docs build)                        |

---

## Project Structure

```
AutoVox/
├── src/
│   ├── frontend/          # React + Vite app
│   │   └── src/
│   │       ├── components/    # ModelViewer, LayerEditor, Layer2DGrid, ...
│   │       └── utils/         # API client, Three.js helpers
│   └── backend/           # FastAPI app
│       └── app/
│           ├── routers/       # stl, project, edit, export endpoints
│           └── services/      # voxelization, editing, history, export
│   └── app/               # Electron desktop app; release DMG under release/
├── docs/                  # SRS, design docs, VnV plans (LaTeX)
└── refs/                  # Reference papers and materials
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10

### Backend

```bash
cd src/backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd src/frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Running Tests

```bash
# Frontend
cd src/frontend && npm test

# Backend
cd src/backend && pytest --cov
```

---

## Team

| Name            | Role      |
| --------------- | --------- |
| Omar Abdelhamid | Developer |
| Daniel Maurer   | Developer |
| Andrew Bovbel   | Developer |
| Olivia Reich    | Developer |
| Khalid Farag    | Developer |

**Supervisor:** Dr. Onaizah — McMaster University, Department of Electrical & Computer Engineering

---

<div align="center">
  <sub>McMaster University · SFWRENG 4G06 Capstone · 2025–2026</sub>
</div>
