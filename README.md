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
