# Contributing to AutoVox

Thank you for your interest in AutoVox. This project is released under the [MIT License](LICENSE). Contributions are welcome from teammates, course staff, and external contributors.

## Before you start

- Read the [Code of Conduct](CodeOfConduct.md). Participation is governed by those rules.
- For **bugs or feature ideas**, open a [GitHub issue](https://github.com/OmarHassanAdelhamid/Five-of-a-Kind-capstone-project-/issues) with a clear title, what you expected, what happened, and how to reproduce it (version, OS, steps).

## Development setup

1. **Clone** the repository and install dependencies as described in the root [README.md](README.md) (backend + web frontend).
2. For the **Electron desktop app** (build or dev), follow [INSTALL.md](INSTALL.md).

## Making changes

1. **Branch** from `main` using a short name that reflects the work (for example `fix/export-csv`, `docs/readme-links`).
2. **Keep changes focused** — one logical change per pull request when possible.
3. **Run tests** before opening a PR:
   - Frontend: `cd src/frontend && npm test`
   - Backend: `cd src/backend && pytest`
4. **Match existing style** — TypeScript/React patterns in `src/frontend`, Python types and structure in `src/backend`, and formatting consistent with the rest of the file.

## Pull requests

- Describe **what** changed and **why** (not only the diff).
- Link related **issues** (`Fixes #123`).
- If the change is user-visible, note it briefly so release notes or course docs can stay accurate.

## Questions

For course-related or team-only questions, use your team’s usual channels (e.g. capstone group chat). For public technical questions, GitHub Issues are appropriate.
