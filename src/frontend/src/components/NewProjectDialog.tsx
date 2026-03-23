import { useState, useEffect, useRef } from 'react';
import { fetchSTLDimensions } from '../utils/api';

type UnitOption = 'µm' | 'mm' | 'cm';


interface NewProjectDialogProps {
  isOpen: boolean;
  stlFileName: string;
  onClose: () => void;
  onConfirm: (
    payload: {
      projectName: string;
      modelUnits: UnitOption;
      scaleFactor: number;
      voxelSize: number;
      defaultMaterial: string;
    },
    onProgress?: (message: string) => void,
  ) => void | Promise<void>;
  initialMaterials?: string[];
}

export const NewProjectDialog = ({
  isOpen,
  stlFileName,
  onClose,
  onConfirm,
  initialMaterials = ['material1', 'material2', 'material3'],
}: NewProjectDialogProps) => {
  const [suffix, setSuffix] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const initialMaterialsRef = useRef(initialMaterials);
  initialMaterialsRef.current = initialMaterials;

  const [modelDimensions, setModelDimensions] = useState<{ x: number; y: number; z: number;} | null>(null);

  const [modelUnits, setModelUnits] = useState<UnitOption>('mm');
  const [scaleFactor, setScaleFactor] = useState<string>('1');
  const [voxelSizeText, setVoxelSizeText] = useState<string>('1');

  const ADD_MATERIAL_VALUE = '__ADD_NEW_MATERIAL__';
  const [materials, setMaterials] = useState<string[]>(initialMaterials);
  const [selectedMaterial, setSelectedMaterial] = useState<string>(
    initialMaterials[0] ?? 'material1',
  );
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [prevSelectedMaterial, setPrevSelectedMaterial] = useState<string>(
    initialMaterials[0] ?? '',
  );
  const [isCreating, setIsCreating] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (inputRef.current) inputRef.current.focus();
      setSuffix('');

      const mats = initialMaterialsRef.current;
      setModelUnits('mm');
      setScaleFactor('1');
      setVoxelSizeText('1');
      setIsAddingMaterial(false);
      setNewMaterialName('');
      setSelectedMaterial(mats[0] ?? 'material1');
      setMaterials(
        mats.length ? mats : ['material1', 'material2', 'material3'],
      );
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !stlFileName) return;
  
    const loadDimensions = async () => {
      try {
        const data = await fetchSTLDimensions(stlFileName);
        setModelDimensions(data.dimensions);
      } catch (error) {
        console.error('Failed to fetch STL dimensions', error);
        setModelDimensions(null);
      }
    };
  
    loadDimensions();
  }, [isOpen, stlFileName]);

  const baseName = stlFileName.replace('.stl', '');
  const fullProjectName = suffix.trim()
    ? `${baseName}-${suffix.trim()}`
    : baseName;

    const parseScaleFactor = (): number | null => {
      const n = Number(scaleFactor);
      if (!Number.isFinite(n) || n <= 0) return null;
      return n;
    };
  

  const parseVoxelSize = (): number | null => {
    const n = Number(voxelSizeText);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const scaleFactor = parseScaleFactor();
    if (scaleFactor === null) {
      alert('Please enter a valid scale factor (> 0).');
      return;
    }

    const voxelSize = parseVoxelSize();
    if (voxelSize === null) {
      alert('Please enter a valid voxel size (> 0).');
      return;
    }

    setIsCreating(true);
    setProgressMessage('Voxelizing model...');

    try {
      console.log('START creating')
      await onConfirm(
        {
          projectName: fullProjectName,
          modelUnits,
          scaleFactor,
          voxelSize,
          defaultMaterial: selectedMaterial,
        },
        setProgressMessage,
      );
      onClose();
    } catch {
      // Error already shown by parent
    } finally {
      setIsCreating(false);
      setProgressMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isCreating) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={isCreating ? undefined : onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>New Project</h3>
          {!isCreating && (
            <button className="dialog-close" onClick={onClose} title="Close">
              ×
            </button>
          )}
        </div>
        {isCreating && (
          <div className="dialog-progress-overlay">
            <div className="dialog-progress-spinner" />
            <p className="dialog-progress-message">{progressMessage}</p>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div
            className={`dialog-body ${isCreating ? 'dialog-body--disabled' : ''}`}
          >
            <label htmlFor="project-name-input">Project Name:</label>
            <div className="project-name-input-wrapper">
              <span className="project-name-prefix">{baseName}-</span>
              <input
                ref={inputRef}
                id="project-name-input"
                type="text"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="project-suffix"
                autoFocus
              />
            </div>
            <p className="dialog-hint">
              Full project name:{' '}
              <strong>
                {baseName}-{suffix || 'project-suffix'}
              </strong>
            </p>

            <hr className="dialog-divider" />

            {/* Model units */}
            <p className="dialog-hint-white">
              <strong> Current dimensions: </strong>
            </p>
            {modelDimensions && (
              <p className="dialog-hint-white">
                {modelDimensions.x} × {modelDimensions.y} × {modelDimensions.z}
              </p>
            )}

            {/* Scale model  */}
            <div className="dialog-section">
              <p className="dialog-hint-white">
                <strong>Factor to scale model dimensions by:</strong>
              </p>
              <div className="inline-row">
                <input
                  id="scale-factor-input"
                  type="text"
                  inputMode="decimal"
                  value={scaleFactor}
                  onChange={(e) => {
                    const value = e.target.value;

                    // Allow empty string
                    if (value === '') {
                      setScaleFactor(value);
                      return;
                    }

                    // Allow valid float or int
                    const floatRegex = /^-?\d*\.?\d*$/;

                    if (floatRegex.test(value)) {
                      setScaleFactor(value);
                    }
                  }}
                  className="scale-factor-input"
                />
                {/* Optional tiny validation hint */}
                {parseScaleFactor() === null && (
                  <p className="dialog-error">
                    Factor must be a number greater than 0
                  </p>
                )}
              </div>
            </div>

            {/* Voxel size + units */}
            <div className="dialog-section">
              <p className="dialog-hint-white">
                <strong>Input desired voxel size:</strong>
              </p>
              <div className="inline-row">
                <input
                  id="voxel-size-input"
                  type="text"
                  inputMode="decimal"
                  value={voxelSizeText}
                  onChange={(e) => {
                    const value = e.target.value;

                    // Allow empty string
                    if (value === '') {
                      setVoxelSizeText(value);
                      return;
                    }

                    // Allow valid float or int
                    const floatRegex = /^-?\d*\.?\d*$/;

                    if (floatRegex.test(value)) {
                      setVoxelSizeText(value);
                    }
                  }}
                  className="voxel-size-input"
                />
                {/* Optional tiny validation hint */}
                {parseVoxelSize() === null && (
                  <p className="dialog-error">
                    Voxel size must be a number greater than 0
                  </p>
                )}
              </div>
            </div>

            {/* Reference units for export in which all measurements are expressed as: */}
            <div className="dialog-section">
              <p className="dialog-hint-white">
                <strong>Reference units for export in which all measurements are expressed as:</strong>
              </p>

              <div className="radio-row">
                {(['µm', 'mm', 'cm'] as UnitOption[]).map((u) => (
                  <label key={u} className="radio-pill">
                    <input
                      type="radio"
                      name="modelUnits"
                      value={u}
                      checked={modelUnits === u}
                      onChange={() => setModelUnits(u)}
                    />
                    <span>{u}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Default material */}
            <div className="dialog-section">
              <p className="dialog-hint-white">
                <strong>Select default material:</strong>
              </p>

              {!isAddingMaterial ? (
                <div className="inline-row">
                  <select
                    id="material-select"
                    value={selectedMaterial}
                    onChange={(e) => {
                      const val = e.target.value;

                      if (val === ADD_MATERIAL_VALUE) {
                        // remember what was selected before switching UI
                        setPrevSelectedMaterial(selectedMaterial);
                        setIsAddingMaterial(true);
                        setNewMaterialName('');
                        return;
                      }

                      setSelectedMaterial(val);
                    }}
                    className="material-select material-select--wide"
                  >
                    {materials.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}

                    <option value={ADD_MATERIAL_VALUE}>+ add material…</option>
                  </select>
                </div>
              ) : (
                <div className="add-material-panel">
                  <input
                    type="text"
                    value={newMaterialName}
                    onChange={(e) => setNewMaterialName(e.target.value)}
                    placeholder="material name"
                    className="add-material-input"
                  />

                  <div className="add-material-actions">
                    <button
                      type="button"
                      className="dialog-button-small"
                      onClick={() => {
                        setIsAddingMaterial(false);
                        setNewMaterialName('');
                        setSelectedMaterial(prevSelectedMaterial); // restore
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="dialog-button-confirm dialog-button-small"
                      disabled={!newMaterialName.trim()}
                      onClick={() => {
                        const name = newMaterialName.trim();
                        if (!name) return;

                        // avoid duplicates (case-insensitive)
                        const existing = materials.find(
                          (m) => m.toLowerCase() === name.toLowerCase(),
                        );
                        const finalName = existing ?? name;

                        if (!existing)
                          setMaterials((prev) => [...prev, finalName]);
                        setSelectedMaterial(finalName);

                        setIsAddingMaterial(false);
                        setNewMaterialName('');
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="dialog-footer">
            <button
              type="button"
              onClick={onClose}
              className="dialog-button-cancel"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dialog-button-confirm"
              disabled={isCreating}
            >
              {isCreating ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
