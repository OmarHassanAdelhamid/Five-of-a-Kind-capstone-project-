/**
 * TypeScript types and payloads for the new-project dialog.
 *
 * @author Khalid Farag
 * @lastModified 2026/04/05
 */
export type UnitOption = 'µm' | 'mm' | 'cm';

// Props for the ConfirmPayload component
export interface ConfirmPayload {
  projectName: string;
  modelUnits: UnitOption;
  scaleFactor: number;
  voxelSize: number;
  defaultMaterial: number;
}
