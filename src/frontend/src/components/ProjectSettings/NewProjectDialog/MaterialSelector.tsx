import { useState } from 'react';

const ADD_MATERIAL_VALUE = '__ADD_NEW_MATERIAL__';

interface MaterialSelectorProps {
  materials: string[];
  selectedMaterial: string;
  onMaterialsChange: (materials: string[]) => void;
  onSelectedChange: (material: string) => void;
}

export const MaterialSelector = ({
  materials,
  selectedMaterial,
  onMaterialsChange,
  onSelectedChange,
}: MaterialSelectorProps) => {
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [prevSelectedMaterial, setPrevSelectedMaterial] =
    useState(selectedMaterial);

  return (
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
                setPrevSelectedMaterial(selectedMaterial);
                setIsAddingMaterial(true);
                setNewMaterialName('');
                return;
              }
              onSelectedChange(val);
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
                onSelectedChange(prevSelectedMaterial);
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

                const existing = materials.find(
                  (m) => m.toLowerCase() === name.toLowerCase(),
                );
                const finalName = existing ?? name;

                if (!existing) onMaterialsChange([...materials, finalName]);
                onSelectedChange(finalName);
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
  );
};
