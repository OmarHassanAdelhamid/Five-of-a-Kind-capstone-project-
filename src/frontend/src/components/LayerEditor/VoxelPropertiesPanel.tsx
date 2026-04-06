/**
 * Side panel for viewing and editing material and magnetization on the current voxel
 * selection.
 *
 * @author Khalid Farag
 * @lastModified 2026/04/05
 */
import { useId, useState } from 'react';
import type { LayerVoxel } from '../../utils/api';
import type { LayerMaterial } from './layerMaterialsDefaults';

// @deprecated Use DEFAULT_LAYER_MATERIALS from layerMaterialsDefaults; kept for compatibility
export { DEFAULT_LAYER_MATERIALS as MATERIALS } from './layerMaterialsDefaults';

// The type for the material palette view
type MaterialPaletteView = 'pick' | 'manage';

// Props for the VoxelPropertiesPanel component
interface VoxelPropertiesPanelProps {
  materials: LayerMaterial[];
  onMaterialColorChange: (id: number, color: string) => void;
  onAddMaterialId: (id: number, color: string) => boolean;
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
  materials,
  onMaterialColorChange,
  onAddMaterialId,
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
  const baseId = useId();
  const [paletteView, setPaletteView] = useState<MaterialPaletteView>('pick');
  const [newMaterialId, setNewMaterialId] = useState('');
  const [newMaterialColor, setNewMaterialColor] = useState('#94a3b8');
  const [manageMessage, setManageMessage] = useState<string | null>(null);

  const pickTabId = `${baseId}-tab-pick`;
  const manageTabId = `${baseId}-tab-manage`;

  // Handles the addition of a new material
  const handleAddMaterial = () => {
    setManageMessage(null);
    const parsed = Number(newMaterialId.trim());
    if (Number.isNaN(parsed)) {
      setManageMessage('Enter a whole number ≥ 1 for the material ID.');
      return;
    }
    if (!Number.isInteger(parsed) || parsed < 1) {
      setManageMessage('Material ID must be a whole number at least 1.');
      return;
    }
    const ok = onAddMaterialId(parsed, newMaterialColor);
    if (!ok) {
      setManageMessage(`Material ID ${parsed} already exists.`);
      return;
    }
    setNewMaterialId('');
    setManageMessage(`Added material ID ${parsed}.`);
  };

  return (
    <div className="voxel-editor-section">
      <h5>Voxel Properties</h5>

      <div
        className="material-palette-tablist"
        role="tablist"
        aria-label="Material palette"
      >
        <button
          type="button"
          id={pickTabId}
          role="tab"
          aria-selected={paletteView === 'pick'}
          aria-controls={`${baseId}-panel-pick`}
          className={`material-palette-tab ${paletteView === 'pick' ? 'active' : ''}`}
          onClick={() => setPaletteView('pick')}
        >
          Use in editor
        </button>
        <button
          type="button"
          id={manageTabId}
          role="tab"
          aria-selected={paletteView === 'manage'}
          aria-controls={`${baseId}-panel-manage`}
          className={`material-palette-tab ${paletteView === 'manage' ? 'active' : ''}`}
          onClick={() => {
            setPaletteView('manage');
            setManageMessage(null);
          }}
        >
          Create / edit IDs
        </button>
      </div>

      {paletteView === 'manage' ? (
        <div
          id={`${baseId}-panel-manage`}
          role="tabpanel"
          aria-labelledby={manageTabId}
          className="material-manage-panel"
        >
          <p className="material-manage-hint">
            Add a numeric material ID (same values the backend uses) and pick a
            display color for the layer view and picker.
          </p>
          <div className="material-manage-add-row">
            <label
              className="material-manage-label"
              htmlFor={`${baseId}-new-id`}
            >
              New ID
            </label>
            <input
              id={`${baseId}-new-id`}
              type="number"
              min={1}
              step={1}
              className="material-manage-input"
              value={newMaterialId}
              onChange={(e) => setNewMaterialId(e.target.value)}
              placeholder="e.g. 7"
            />
            <label
              className="material-manage-sr-only"
              htmlFor={`${baseId}-new-color`}
            >
              Color for new material
            </label>
            <input
              id={`${baseId}-new-color`}
              type="color"
              className="material-manage-color-input"
              value={newMaterialColor}
              onChange={(e) => setNewMaterialColor(e.target.value)}
              title="Color"
            />
            <button
              type="button"
              className="material-manage-add-btn"
              onClick={handleAddMaterial}
            >
              Add
            </button>
          </div>
          {manageMessage && (
            <p className="material-manage-feedback" role="status">
              {manageMessage}
            </p>
          )}
          <ul className="material-manage-list">
            {materials.map((mat) => (
              <li key={mat.id} className="material-manage-row">
                <span className="material-manage-id" title={mat.name}>
                  ID {mat.id}
                </span>
                <label
                  className="material-manage-sr-only"
                  htmlFor={`${baseId}-color-${mat.id}`}
                >
                  Color for material {mat.id}
                </label>
                <input
                  id={`${baseId}-color-${mat.id}`}
                  type="color"
                  className="material-manage-color-input"
                  value={mat.color}
                  onChange={(e) =>
                    onMaterialColorChange(mat.id, e.target.value)
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      ) : selectedVoxelIndices.size > 0 ? (
        <div
          id={`${baseId}-panel-pick`}
          role="tabpanel"
          aria-labelledby={pickTabId}
        >
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
                {materials.map((mat) => (
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
        </div>
      ) : (
        <p
          className="no-voxel-selected"
          id={`${baseId}-panel-pick`}
          role="tabpanel"
          aria-labelledby={pickTabId}
        >
          Click or use lasso to select voxels in the 2D view
        </p>
      )}
    </div>
  );
}
