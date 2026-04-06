# AutoVox — Installation

**Team Five of a Kind · AutoVox User Manual (installation excerpt)**  
Revision aligned with April 6, 2026 manual.

AutoVox is a desktop app (Electron + Vite frontend + FastAPI backend) for voxel-based, multi-material 3D print design. The standalone build is developed and tested primarily on **macOS**. If a pre-built Windows installer does not work for you, clone this repository and build locally using the steps below.

---

## Prerequisites

| Requirement | Notes |
| ----------- | ----- |
| **Node.js** | 18 or newer (project tooling expects a current LTS). |
| **Python** | **Packaged app:** 3.9+ required; **3.10+** matches the rest of the repo. On first launch the app uses your interpreter to create a private virtual environment and install the bundled backend from `src/backend/requirements.txt`. |
| **Windows** | During Python setup, either enable **Add python.exe to PATH**, or keep the full path to `python.exe` ready if the first-run setup screen asks for it. |

---

## Build the packaged app from source

From the repository root:

```bash
cd src/app
npm install
npm run pack
```

This builds the Vite frontend with `VITE_API_BASE_URL=http://127.0.0.1:8765` (used when the app talks to its embedded backend), then runs **electron-builder**. Installers and archives are written under **`src/app/release/`** — for example **macOS** produces a **zip** (and an unpacked app under `release/mac-arm64/` for local testing); **Windows** targets typically include an **NSIS `.exe`** and a **zip**.

**Notice:** Building a **Windows** installer is intended on **Windows** (or in CI on a Windows runner). The macOS configuration in this repo targets **zip** (not cross-compiled Windows artifacts from macOS).

---

## First launch (packaged build)

Expect a short **setup** phase the first time you open the app: Python is detected or chosen, a **venv** is created under app user data, and dependencies are installed with **pip**. Later launches reuse that environment.

---

## Develop without packaging

Run the backend and the Electron shell against the Vite dev server (same workflow as the main project README).

1. **Backend** — from `src/backend`:

   ```bash
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

   The API listens at **`http://localhost:8000`** (interactive docs at `/docs`).

2. **Desktop + frontend** — from `src/app` (after `npm install`):

   ```bash
   npm run dev
   ```

   In development, Electron expects the API on **port 8000** (override with `DESKTOP_API_PORT` if needed). Vite serves the UI on port **5173**.

---

## Uninstall

### Remove the application

- **macOS:** Delete **Autovox** (or **Autovox.app**) from **Applications** or wherever you placed it.
- **Windows:** Uninstall via **Settings → Apps** if an installer registered the app, or delete the install folder; remove Start menu / desktop shortcuts if present.

### Optional: remove app data

The packaged app stores its Python runtime, venv, workspace, and logs under Electron’s **user data** directory. Removing it frees disk space and resets first-run setup; **back up any projects** you care about before deleting.

Typical locations:

- **macOS:** `~/Library/Application Support/autovox-desktop`
- **Windows:** `%APPDATA%\autovox-desktop`
- **Linux:** `~/.config/autovox-desktop`

If the folder name differs slightly, search for **autovox** under Application Support / AppData.

---

## More help

- Full project overview, tests, and structure: **[README.md](README.md)** at the repo root.
- End-user topics (terminology, layer editor, partitions, export, FAQs): **AutoVox User Manual** (same content as your capstone user manual document).
