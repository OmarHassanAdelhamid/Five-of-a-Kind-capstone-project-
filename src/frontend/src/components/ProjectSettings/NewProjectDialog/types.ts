// This file contains the types for the new project dialog
export type UnitOption = 'µm' | 'mm' | 'cm';

// Props for the ConfirmPayload component
export interface ConfirmPayload {
  projectName: string;
  modelUnits: UnitOption;
  scaleFactor: number;
  voxelSize: number;
  defaultMaterial: number;
}
