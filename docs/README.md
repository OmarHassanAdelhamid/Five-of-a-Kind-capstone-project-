# Documentation

This folder holds capstone and engineering documentation for **AutoVox** (requirements, design, verification, reflections, and presentations). Source formats are mostly LaTeX and AsciiDoc; PDFs are generated locally or via CI where applicable.

## Folders

| Folder | Contents |
| ------ | -------- |
| `Design/` | Module Guide (MG) and Module Interface Specification (MIS) |
| `DevelopmentPlan/` | Project development plan |
| `Extras/` | Supplementary material (e.g. usability notes) |
| `HazardAnalysis/` | FMEA-style safety analysis |
| `Presentations/` | Milestone and EXPO slides |
| `ProblemStatementAndGoals/` | Problem statement and goals |
| `projMngmnt/` | Team contribution summaries at milestones |
| `ReflectAndTrace/` | Reflection and traceability |
| `SRS-Meyer/requirements/` | Software requirements (Meyer-style SRS) |
| `VnVPlan/` | Verification and validation plan |
| `VnVReport/` | VnV report and evidence |

Shared LaTeX helpers at this level include `Common.tex`, `Comments.tex`, and `Makefile` where builds are orchestrated from `docs/`.
