// This component is used to display the project selector (select a project from the list of available projects)

import type { ChangeEvent } from 'react';

// Props for the ProjectSelector component
interface ProjectSelectorProps {
  availableProjects: string[];
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onLoadVoxels: () => void;
  disabled?: boolean;
  voxelCount?: number;
}

export const ProjectSelector = ({
  availableProjects,
  projectName,
  onProjectNameChange,
  onLoadVoxels,
  disabled,
  voxelCount,
}: ProjectSelectorProps) => {
  // Handles the key down event on the project name input instead of the load voxels button
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onLoadVoxels();
    }
  };

  return (
    <>
      <div className="project-settings-block">
        <label className="project-settings-label" htmlFor="project-name">
          Project (voxelized data)
        </label>
        <div className="project-settings-row">
          {availableProjects.length > 0 ? (
            <select
              id="project-name"
              value={projectName}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                onProjectNameChange(e.target.value)
              }
              className="project-settings-select"
            >
              <option value="">Select a project…</option>
              {availableProjects.map((proj) => (
                <option key={proj} value={proj}>
                  {proj}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onProjectNameChange(e.target.value)
              }
              placeholder="Enter project name"
              onKeyDown={handleKeyDown}
              className="project-settings-input"
            />
          )}
          <button
            type="button"
            onClick={onLoadVoxels}
            disabled={!projectName.trim() || disabled}
            className="project-settings-btn-primary"
          >
            Load voxels
          </button>
        </div>
        {availableProjects.length === 0 && (
          <p className="project-settings-hint">
            No projects yet. Voxelize an STL from the File menu first.
          </p>
        )}
      </div>
      {voxelCount !== undefined && voxelCount > 0 && (
        <p className="project-settings-status" role="status">
          Loaded {voxelCount.toLocaleString()} voxel coordinates
        </p>
      )}
    </>
  );
};
