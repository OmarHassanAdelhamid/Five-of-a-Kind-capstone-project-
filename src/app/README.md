# AutoVox desktop (`src/app`)

Electron shell that loads the Vite-built UI and runs (or connects to) the Python backend. Product name **Autovox**; package name `autovox-desktop`.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm install` | Install Electron tooling and deps |
| `npm run dev` | Runs Vite from `../frontend` on port 5173 and opens Electron; in dev the backend is expected on **port 8000** (override with `DESKTOP_API_PORT`) |
| `npm run pack` | Builds frontend with `VITE_API_BASE_URL=http://127.0.0.1:8765`, then **electron-builder** → output under **`release/`** |
| `npm run pack:dir` | Same as pack but `--dir` (unpackaged output for quick testing) |

## Outputs

Installers and archives are written to **`release/`** (e.g. macOS zip, Windows NSIS + zip when built on Windows). See root [INSTALL.md](../../INSTALL.md) for prerequisites, first-run Python setup, and uninstall.

## Layout

- `electron/main.cjs` — Main process: windows, backend spawn, IPC
- `electron/` — Preload and setup HTML as needed
- `build/` — Packaging assets (e.g. icon)

The bundled app includes built files from `../frontend/dist` and Python sources from `../backend` per `package.json` → `build.extraResources`.

## Related docs

- [INSTALL.md](../../INSTALL.md) — build from source, dev without packaging  
- [../README.md](../README.md) — repository layout  
- [../frontend/README.md](../frontend/README.md) — UI stack
