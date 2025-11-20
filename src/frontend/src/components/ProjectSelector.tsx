import type { ChangeEvent } from 'react'

interface ProjectSelectorProps {
  availableProjects: string[]
  projectName: string
  onProjectNameChange: (name: string) => void
  onLoadVoxels: () => void
  disabled?: boolean
  voxelCount?: number
}

export const ProjectSelector = ({
  availableProjects,
  projectName,
  onProjectNameChange,
  onLoadVoxels,
  disabled,
  voxelCount,
}: ProjectSelectorProps) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onLoadVoxels()
    }
  }

  return (
    <>
      <div className="model-selector" style={{ marginTop: '1rem' }}>
        <label htmlFor="project-name">Project Name (for voxelized data)</label>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {availableProjects.length > 0 ? (
            <select
              id="project-name"
              value={projectName}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                onProjectNameChange(e.target.value)
              }
              style={{
                padding: '0.6rem 0.9rem',
                borderRadius: '0.75rem',
                border: '1px solid rgba(148, 163, 184, 0.45)',
                background: 'rgba(15, 23, 42, 0.65)',
                color: '#e2e8f0',
                fontSize: '0.9rem',
                outline: 'none',
                minWidth: '200px',
              }}
            >
              <option value="">Select a project...</option>
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
              style={{
                padding: '0.6rem 0.9rem',
                borderRadius: '0.75rem',
                border: '1px solid rgba(148, 163, 184, 0.45)',
                background: 'rgba(15, 23, 42, 0.65)',
                color: '#e2e8f0',
                fontSize: '0.9rem',
                outline: 'none',
                minWidth: '200px',
              }}
            />
          )}
          <button
            onClick={onLoadVoxels}
            disabled={!projectName.trim() || disabled}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '0.75rem',
              border: 'none',
              background:
                'linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.8))',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor:
                projectName.trim() && !disabled ? 'pointer' : 'not-allowed',
              opacity: projectName.trim() && !disabled ? 1 : 0.5,
              transition: 'opacity 0.2s',
            }}
          >
            Load Voxels
          </button>
        </div>
        {availableProjects.length === 0 && (
          <p
            style={{
              color: '#94a3b8',
              fontSize: '0.75rem',
              marginTop: '0.25rem',
            }}
          >
            No projects available. Create one by voxelizing an STL file first.
          </p>
        )}
      </div>
      {voxelCount !== undefined && voxelCount > 0 && (
        <p
          style={{
            color: '#bef264',
            fontSize: '0.85rem',
            marginTop: '0.5rem',
          }}
        >
          Loaded {voxelCount} voxel coordinates
        </p>
      )}
    </>
  )
}

