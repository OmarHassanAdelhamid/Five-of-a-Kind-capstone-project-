import { useState, useEffect, useRef } from 'react';

type UnitOption = 'nm' | 'mm' | 'cm'

interface NewProjectDialogProps {
  isOpen: boolean;
  stlFileName: string;
  onClose: () => void;
  onConfirm: (
    payload: {
      projectName: string
      modelUnits: UnitOption
      voxelSize: number
      voxelUnits: UnitOption
      defaultMaterial: string
    },
    onProgress?: (message: string) => void
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

  const [modelUnits, setModelUnits] = useState<UnitOption>('mm')
  const [voxelSizeText, setVoxelSizeText] = useState<string>('1')
  const [voxelUnits, setVoxelUnits] = useState<UnitOption>('mm')

  const ADD_MATERIAL_VALUE = '__ADD_NEW_MATERIAL__'
  const [materials, setMaterials] = useState<string[]>(initialMaterials)
  const [selectedMaterial, setSelectedMaterial] = useState<string>(initialMaterials[0] ?? 'material1')
  const [isAddingMaterial, setIsAddingMaterial] = useState(false)
  const [newMaterialName, setNewMaterialName] = useState('')
  const [prevSelectedMaterial, setPrevSelectedMaterial] = useState<string>(initialMaterials[0] ?? '')
  const [isCreating, setIsCreating] = useState(false)
  const [progressMessage, setProgressMessage] = useState<string>('')

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSuffix(''); // Reset suffix when dialog opens

      setModelUnits('mm')
      setVoxelUnits('mm')
      setVoxelSizeText('1')
      setIsAddingMaterial(false)
      setNewMaterialName('')
      setSelectedMaterial((initialMaterials[0] ?? 'material1'))
      setMaterials(initialMaterials.length ? initialMaterials : ['material1', 'material2', 'material3'])
    }
  }, [isOpen, initialMaterials]);

  const baseName = stlFileName.replace('.stl', '')
  const fullProjectName = suffix.trim() ? `${baseName}-${suffix.trim()}` : baseName

  const parseVoxelSize = (): number | null => {
    const n = Number(voxelSizeText)
    if (!Number.isFinite(n) || n <= 0) return null
    return n
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const voxelSize = parseVoxelSize()
    if (voxelSize === null) {
      alert('Please enter a valid voxel size (> 0).')
      return
    }

    setIsCreating(true)
    setProgressMessage('Voxelizing model...')

    try {
      await onConfirm(
        {
          projectName: fullProjectName,
          modelUnits,
          voxelSize,
          voxelUnits,
          defaultMaterial: selectedMaterial,
        },
        setProgressMessage
      )
      onClose()
    } catch {
      // Error already shown by parent
    } finally {
      setIsCreating(false)
      setProgressMessage('')
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
          <div className={`dialog-body ${isCreating ? 'dialog-body--disabled' : ''}`}>
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
              Full project name: <strong>{baseName}-{suffix || 'project-suffix'}</strong>
            </p>

            <hr className="dialog-divider" />

            {/* Model units */}
            <div className="dialog-section">
              <p className="dialog-hint-white">
                Define model units:
              </p>

              <div className="radio-row">
                {(['nm', 'mm', 'cm'] as UnitOption[]).map((u) => (
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

            {/* Voxel size + units */}
            <div className="dialog-section">
              <p className="dialog-hint-white">
              Input desired voxel size:
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
                    if (value === "") {
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
                  <p className="dialog-error">Voxel size must be a number greater than 0</p>
                )}
              </div>

              <div className="subsection">

                <p className="dialog-hint-white">
                Select units that apply to voxel size:
                </p>
                 <div className="radio-row">
                  {(['nm', 'mm', 'cm'] as UnitOption[]).map((u) => (
                    <label key={u} className="radio-pill">
                      <input
                        type="radio"
                        name="voxelUnits"
                        value={u}
                        checked={voxelUnits === u}
                        onChange={() => setVoxelUnits(u)}
                      />
                      <span>{u}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Default material */}
            <div className="dialog-section">
              <p className="dialog-hint-white">Select default material:</p>

              {!isAddingMaterial ? (
                <div className="inline-row">
                  <select
                    id="material-select"
                    value={selectedMaterial}
                    onChange={(e) => {
                      const val = e.target.value

                      if (val === ADD_MATERIAL_VALUE) {
                        // remember what was selected before switching UI
                        setPrevSelectedMaterial(selectedMaterial)
                        setIsAddingMaterial(true)
                        setNewMaterialName('')
                        return
                      }

                      setSelectedMaterial(val)
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
                        setIsAddingMaterial(false)
                        setNewMaterialName('')
                        setSelectedMaterial(prevSelectedMaterial) // restore
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="dialog-button-confirm dialog-button-small"
                      disabled={!newMaterialName.trim()}
                      onClick={() => {
                        const name = newMaterialName.trim()
                        if (!name) return

                        // avoid duplicates (case-insensitive)
                        const existing = materials.find((m) => m.toLowerCase() === name.toLowerCase())
                        const finalName = existing ?? name

                        if (!existing) setMaterials((prev) => [...prev, finalName])
                        setSelectedMaterial(finalName)

                        setIsAddingMaterial(false)
                        setNewMaterialName('')
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
