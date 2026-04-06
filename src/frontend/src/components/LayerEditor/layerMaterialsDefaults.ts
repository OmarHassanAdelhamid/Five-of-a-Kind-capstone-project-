/**
 * Default material IDs and display metadata used when listing materials in the layer editor.
 *
 * @author Khalid Farag
 * @lastModified 2026/04/05
 */
export type LayerMaterial = {
  id: number;
  name: string;
  color: string;
};

// The default layer materials
export const DEFAULT_LAYER_MATERIALS: LayerMaterial[] = [
  { id: 1, name: 'Material 1', color: '#ef4444' },
  { id: 2, name: 'Material 2', color: '#f97316' },
  { id: 3, name: 'Material 3', color: '#eab308' },
  { id: 4, name: 'Material 4', color: '#22c55e' },
  { id: 5, name: 'Material 5', color: '#3b82f6' },
  { id: 6, name: 'Material 6', color: '#8b5cf6' },
];
