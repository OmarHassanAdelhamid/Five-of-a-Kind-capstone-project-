/**
 * Material picker and optional “add material” flow for new project creation.
 *
 * @author Khalid Farag, Olivia Reich
 * @lastModified 2026/04/05
 */
import { useMemo, useState } from 'react';

const ADD_MATERIAL_VALUE = '__ADD_NEW_MATERIAL__';

function formatMaterialLabel(id: number): string {
  return `Material ${id}`;
}

// Props for the MaterialSelector component
interface MaterialSelectorProps {
  materialIds: number[];
  selectedMaterialId: number;
  onMaterialIdsChange: (ids: number[]) => void;
  onSelectedChange: (id: number) => void;
}

// Gets the next available material id
export function nextAvailableMaterialId(ids: number[]): number {
  if (ids.length === 0) return 1;
  return Math.max(...ids) + 1;
}

export const MaterialSelector = ({
  materialIds,
  selectedMaterialId,
  onMaterialIdsChange,
  onSelectedChange,
}: MaterialSelectorProps) => {
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [prevSelectedId, setPrevSelectedId] = useState(selectedMaterialId);

  // Sorts the material ids
  const sortedIds = useMemo(
    () => [...materialIds].sort((a, b) => a - b),
    [materialIds],
  );

  // Gets the next available material id
  const idToAdd = useMemo(
    () => nextAvailableMaterialId(sortedIds),
    [sortedIds],
  );

  return (
    <div className="dialog-section dialog-section--material">
      <p className="dialog-section-title">Default material ID for new voxels</p>
      <p className="dialog-hint dialog-hint--subtle">
        Stored as an integer in the project (e.g. 1, 2, 3). Must be ≥ 1.
      </p>

      {!isAddingMaterial ? (
        <div className="inline-row inline-row--material">
          <select
            id="material-select"
            value={String(selectedMaterialId)}
            onChange={(e) => {
              const val = e.target.value;
              if (val === ADD_MATERIAL_VALUE) {
                setPrevSelectedId(selectedMaterialId);
                setIsAddingMaterial(true);
                return;
              }
              onSelectedChange(Number(val));
            }}
            className="material-select"
            aria-label="Default material ID"
          >
            {sortedIds.map((id) => (
              <option key={id} value={String(id)}>
                {formatMaterialLabel(id)}
              </option>
            ))}
            <option value={ADD_MATERIAL_VALUE}>+ Add material ID…</option>
          </select>
        </div>
      ) : (
        <div className="add-material-panel">
          <p className="add-material-preview">
            Adds <strong>material ID {idToAdd}</strong> (
            {formatMaterialLabel(idToAdd)}) to the list and selects it as the
            default.
          </p>
          <div className="add-material-actions">
            <button
              type="button"
              className="dialog-button-small"
              onClick={() => {
                setIsAddingMaterial(false);
                onSelectedChange(prevSelectedId);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="dialog-button-confirm dialog-button-small"
              onClick={() => {
                const nextId = nextAvailableMaterialId(sortedIds);
                onMaterialIdsChange(
                  [...sortedIds, nextId].sort((a, b) => a - b),
                );
                onSelectedChange(nextId);
                setIsAddingMaterial(false);
              }}
            >
              Add ID {idToAdd}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
