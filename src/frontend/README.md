# AutoVox frontend

React 19 + TypeScript + Vite SPA: 3D voxel viewer (Three.js), layer editor, project and partition workflows. Talks to the FastAPI backend over HTTP.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm install` | Install dependencies |
| `npm run dev` | Vite dev server (default `http://localhost:5173`) |
| `npm run build` | Typecheck and production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run test` | Jest + Testing Library |
| `npm run test:coverage` | Tests with coverage |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## API base URL

The client reads **`VITE_API_BASE_URL`** via `src/utils/constants.ts` (falls back to `http://localhost:8000`). The Electron desktop build sets `VITE_API_BASE_URL=http://127.0.0.1:8765` when bundling the static UI so the packaged app hits the embedded backend.

## Layout

- `src/components/` — UI (model viewer, layer editor, grids, menus, project dialogs, …)
- `src/utils/` — API client (`api.ts`), Three.js helpers, constants
- Tests — colocated as `*.test.ts` / `*.test.tsx` with `setupTests.ts` at `src/`

## Related docs

- Root [README.md](../../README.md) — backend + dev workflow  
- [INSTALL.md](../../INSTALL.md) — `npm run dev` from `src/app` with Electron  
- [../README.md](../README.md) — `src/` overview
