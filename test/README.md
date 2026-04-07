# Test layout

Automated tests are **not** centralized in this top-level `test/` folder. They run from each component:

- **Frontend:** `src/frontend` — `npm test` (Jest + Testing Library).
- **Backend:** `src/backend` — `pytest` (see `pytest.ini` / `requirements.txt`).

Use this folder only if you add integration tests that should stay separate from `src/`. Currently the project relies on per-package test suites above.
