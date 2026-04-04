// This component is used to display the voxel properties panel

import type { LayerVoxel } from '../../utils/api';

// Material options with colors
export const MATERIALS = [
  { id: 1, name: 'Material 1', color: '#ef4444' }, // Red
  { id: 2, name: 'Material 2', color: '#f97316' }, // Orange
  { id: 3, name: 'Material 3', color: '#eab308' }, // Yellow
  { id: 4, name: 'Material 4', color: '#22c55e' }, // Green
  { id: 5, name: 'Material 5', color: '#3b82f6' }, // Blue
  { id: 6, name: 'Material 6', color: '#8b5cf6' }, // Purple
];

// Props for the VoxelPropertiesPanel component
interface VoxelPropertiesPanelProps {
  selectedVoxelIndices: Set<number>;
  selectedVoxel: LayerVoxel | null;
  selectedVoxelIndex: number | null;
  selectedMaterial: number;
  displayTheta: string;
  displayPhi: string;
  hasChanges: boolean;
  loading: boolean;
  onMaterialChange: (id: number) => void;
  onThetaChange: (value: string) => void;
  onPhiChange: (value: string) => void;
  onConfirmMaterial: () => void;
  onConfirmMagnetization: () => void;
}

// VoxelPropertiesPanel component
export function VoxelPropertiesPanel({
  selectedVoxelIndices,
  selectedVoxel,
  selectedVoxelIndex,
  selectedMaterial,
  displayTheta,
  displayPhi,
  hasChanges,
  loading,
  onMaterialChange,
  onThetaChange,
  onPhiChange,
  onConfirmMaterial,
  onConfirmMagnetization,
}: VoxelPropertiesPanelProps) {
  return (
    <div className="voxel-editor-section">
      <h5>Voxel Properties</h5>

      {selectedVoxelIndices.size > 0 ? (
        <>
          <p className="selected-voxel-info">
            {selectedVoxelIndices.size === 1 &&
            selectedVoxel &&
            selectedVoxelIndex !== null ? (
              <>
                Selected: Voxel #{selectedVoxelIndex} at (
                {selectedVoxel.x.toFixed(2)}, {selectedVoxel.y.toFixed(2)},{' '}
                {selectedVoxel.z.toFixed(2)})
              </>
            ) : (
              <>Selected: {selectedVoxelIndices.size} voxels</>
            )}
          </p>

          <div className="voxel-editor-grid">
            <div className="editor-column materials-column">
              <h6>Material</h6>
              <div className="material-grid">
                {MATERIALS.map((mat) => (
                  <button
                    key={mat.id}
                    className={`material-square ${selectedMaterial === mat.id ? 'selected' : ''}`}
                    style={{ backgroundColor: mat.color }}
                    onClick={() => onMaterialChange(mat.id)}
                    title={mat.name}
                  >
                    {mat.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="editor-column angles-column">
              <h6>Magnetization</h6>
              <div className="magnetization-inputs">
                <div className="magnetization-input-row">
                  <label htmlFor="theta-input">θ (polar) °</label>
                  <input
                    id="theta-input"
                    type="number"
                    min={0}
                    max={180}
                    step={0.1}
                    value={displayTheta}
                    onChange={(e) => onThetaChange(e.target.value)}
                    className="magnetization-input"
                  />
                </div>
                <div className="magnetization-input-row">
                  <label htmlFor="phi-input">φ (azimuth) °</label>
                  <input
                    id="phi-input"
                    type="number"
                    min={0}
                    max={360}
                    step={0.1}
                    value={displayPhi}
                    onChange={(e) => onPhiChange(e.target.value)}
                    className="magnetization-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="voxel-editor-actions">
            <button
              className="confirm-button material-button"
              onClick={onConfirmMaterial}
              disabled={!hasChanges || loading}
              title="Update the material of this voxel"
            >
              {loading ? 'Saving...' : 'Update Material'}
            </button>
            <button
              className="confirm-button magnetization-button"
              onClick={onConfirmMagnetization}
              disabled={!hasChanges || loading}
              title="Update the magnetization angle of this voxel"
            >
              {loading ? 'Saving...' : 'Update Magnetization'}
            </button>
          </div>
        </>
      ) : (
        <p className="no-voxel-selected">
          Click or use lasso to select voxels in the 2D view
        </p>
      )}
    </div>
  );
}
