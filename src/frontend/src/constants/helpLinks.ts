/**
 * GitHub "blob" URLs for repository documents linked from the Help menu.
 * Paths must match files under https://github.com/OmarHassanAdelhamid/Five-of-a-Kind-capstone-project-
 */
const REPO_DOCS_BASE =
  'https://github.com/OmarHassanAdelhamid/Five-of-a-Kind-capstone-project-/blob/main';

export const HELP_LINKS = {
  /** docs/Extras/UserManual/UserManual.pdf */
  userManualPdf: `${REPO_DOCS_BASE}/docs/Extras/UserManual/UserManual.pdf`,
  license: `${REPO_DOCS_BASE}/LICENSE`,
  privacy: `${REPO_DOCS_BASE}/PRIVACY.md`,
} as const;
