// This file contains the logic for the layer materials for the layer editor
import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_LAYER_MATERIALS,
  type LayerMaterial,
} from './layerMaterialsDefaults';

const STORAGE_PREFIX = 'layer-editor-material-palette:';

// The storage key for the layer materials
function storageKey(projectName: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(projectName.trim())}`;
}

// Merges the stored layer materials with the default layer materials
function mergeWithDefaults(stored: LayerMaterial[] | null): LayerMaterial[] {
  const byId = new Map<number, LayerMaterial>();
  for (const m of DEFAULT_LAYER_MATERIALS) {
    byId.set(m.id, { ...m });
  }
  if (stored) {
    for (const m of stored) {
      if (!Number.isInteger(m.id) || m.id < 1) continue;
      const prev = byId.get(m.id);
      byId.set(m.id, {
        id: m.id,
        name: (m.name && m.name.trim()) || prev?.name || `Material ${m.id}`,
        color: m.color || prev?.color || '#64748b',
      });
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.id - b.id);
}

// Loads the layer materials from the storage
function loadFromStorage(projectName: string): LayerMaterial[] {
  if (!projectName.trim()) return [...DEFAULT_LAYER_MATERIALS];
  try {
    const raw = localStorage.getItem(storageKey(projectName));
    if (!raw) return [...DEFAULT_LAYER_MATERIALS];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_LAYER_MATERIALS];
    return mergeWithDefaults(parsed as LayerMaterial[]);
  } catch {
    return [...DEFAULT_LAYER_MATERIALS];
  }
}

// Saves the layer materials to the storage
function saveToStorage(projectName: string, materials: LayerMaterial[]) {
  if (!projectName.trim()) return;
  try {
    localStorage.setItem(storageKey(projectName), JSON.stringify(materials));
  } catch {
    // ignore
  }
}

// The hook for the layer materials
export function useLayerMaterials(projectName: string) {
  const [materials, setMaterials] = useState<LayerMaterial[]>(() =>
    loadFromStorage(projectName),
  );

  // Loads the layer materials from the storage when the project name changes.
  useEffect(() => {
    setMaterials(loadFromStorage(projectName));
  }, [projectName]);

  // Sets the color of a material
  const setMaterialColor = useCallback(
    (id: number, color: string) => {
      setMaterials((prev) => {
        const next = prev.map((m) =>
          m.id === id ? { ...m, color } : m,
        );
        saveToStorage(projectName, next);
        return next;
      });
    },
    [projectName],
  );

  // Adds a material
  const addMaterial = useCallback(
    (id: number, color: string): boolean => {
      if (!Number.isInteger(id) || id < 1) return false;
      let added = false;
      setMaterials((prev) => {
        if (prev.some((m) => m.id === id)) return prev;
        added = true;
        const next = [
          ...prev,
          { id, name: `Material ${id}`, color },
        ].sort((a, b) => a.id - b.id);
        saveToStorage(projectName, next);
        return next;
      });
      return added;
    },
    [projectName],
  );

  // Ensures IDs used by voxels on the current layer appear in the palette 
  const ensureMaterialIdsForVoxels = useCallback(
    (materialIds: Iterable<number>) => {
      setMaterials((prev) => {
        const have = new Set(prev.map((m) => m.id));
        const additions: LayerMaterial[] = [];
        for (const id of materialIds) {
          if (!Number.isInteger(id) || id < 1 || have.has(id)) continue;
          have.add(id);
          additions.push({ id, name: `Material ${id}`, color: '#64748b' });
        }
        if (additions.length === 0) return prev;
        const next = [...prev, ...additions].sort((a, b) => a.id - b.id);
        saveToStorage(projectName, next);
        return next;
      });
    },
    [projectName],
  );

  return {
    materials,
    setMaterialColor,
    addMaterial,
    ensureMaterialIdsForVoxels,
  };
}
