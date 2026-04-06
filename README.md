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

Pre-built **Apple Silicon (ARM64)** app is shipped as a **zip** that contains **`Autovox.app`** (not a DMG). The archive may be stored with **Git LFS**; use GitHub’s file page to download the real zip, not a `/raw/` URL (that can show an LFS pointer).

1. Open **[`Autovox-0.1.0-arm64-mac.zip` on GitHub](https://github.com/OmarHassanAdelhamid/Five-of-a-Kind-capstone-project-/blob/main/src/app/release/Autovox-0.1.0-arm64-mac.zip)**.
2. Click **Download raw file** (or **⋯** → **Download**).

**Install**

1. Unzip the download — you get **`Autovox.app`**.
2. Drag **Autovox** into **Applications** (or run it from **Downloads**).
3. The build is **not signed or notarized** by Apple. The first time you open it, use **Control+click** → **Open** → **Open**, or **System Settings → Privacy & Security** → **Open Anyway** after a blocked launch.
4. On **first run**, the app may ask for **Python 3.9+** (or use the setup flow) so it can create a local environment and install the bundled FastAPI backend.

With Git: `git lfs install`, clone, then `git lfs pull` if the zip is tracked with LFS.

**“Autovox is damaged and can’t be opened” (move to Trash)**  
Usually **Gatekeeper / quarantine** on unsigned builds, not a bad download. After unzipping, clear quarantine on the app (or the zip before unzipping), then open again:

```bash
xattr -cr ~/Downloads/Autovox.app
# or, if you moved it:
xattr -cr /Applications/Autovox.app
```

Optional before unzip:

```bash
xattr -d com.apple.quarantine ~/Downloads/Autovox-0.1.0-arm64-mac.zip
```

To rebuild the zip from source: from `src/app`, run `npm install` (once) then `npm run pack` (`electron-builder` writes `release/Autovox-0.1.0-arm64-mac.zip` and an unpacked `release/mac-arm64/Autovox.app` for local testing only — only the **zip** is meant for sharing).

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
│   ├── frontend/          # React + Vite UI
│   ├── app/               # Electron shell (desktop); `npm run pack` → release/
│   └── backend/           # FastAPI app
│       └── app/
│           ├── routers/       # stl, project, edit, export endpoints
│           └── services/      # voxelization, editing, history, export
├── docs/                  # Capstone docs: SRS, design, VnV, reflections (see docs/README.md)
├── refs/                  # Reference papers and materials
└── test/                  # Notes on automated tests (see test/README.md)
```

More detail: [src/README.md](src/README.md).

---

## Repository files

| File | Purpose |
| ---- | ------- |
| [INSTALL.md](INSTALL.md) | Packaged desktop app: build, first run, uninstall |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute (issues, PRs, tests) |
| [CodeOfConduct.md](CodeOfConduct.md) | Contributor Covenant community standards |
| [LICENSE](LICENSE) | MIT License |

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
