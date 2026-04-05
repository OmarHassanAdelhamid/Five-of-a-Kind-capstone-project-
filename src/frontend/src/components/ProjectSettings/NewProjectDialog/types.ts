export type UnitOption = 'µm' | 'mm' | 'cm';

export interface ConfirmPayload {
  projectName: string;
  modelUnits: UnitOption;
  scaleFactor: number;
  voxelSize: number;
  defaultMaterial: number;
}
