import { useNewProjectForm } from './useNewProjectForm';
import { DialogHeader } from './DialogHeader';
import { CreatingProgressOverlay } from './CreatingProgressOverlay';
import { ProjectNameField } from './ProjectNameField';
import { ModelDimensionsDisplay } from './ModelDimensionsDisplay';
import { FloatInputField } from './FloatInputField';
import { UnitSelector } from './UnitSelector';
import { MaterialSelector } from './MaterialSelector';
import { DialogFooter } from './DialogFooter';
import type { ConfirmPayload } from './types';

interface NewProjectDialogProps {
  isOpen: boolean;
  stlFileName: string;
  onClose: () => void;
  onConfirm: (
    payload: ConfirmPayload,
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
  const form = useNewProjectForm(
    isOpen,
    stlFileName,
    initialMaterials,
    onClose,
    onConfirm,
  );

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={form.isCreating ? undefined : onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <DialogHeader isCreating={form.isCreating} onClose={onClose} />
        {form.isCreating && (
          <CreatingProgressOverlay message={form.progressMessage} />
        )}
        <form onSubmit={form.handleSubmit}>
          <div
            className={`dialog-body ${form.isCreating ? 'dialog-body--disabled' : ''}`}
          >
            <ProjectNameField
              baseName={form.baseName}
              suffix={form.suffix}
              onSuffixChange={form.setSuffix}
              onKeyDown={form.handleKeyDown}
              inputRef={form.inputRef}
            />

            <hr className="dialog-divider" />

            <ModelDimensionsDisplay dimensions={form.modelDimensions} />

            <FloatInputField
              id="scale-factor-input"
              label="Factor to scale model dimensions by:"
              value={form.scaleFactor}
              onChange={form.setScaleFactor}
              isValid={form.parseScaleFactor() !== null}
              errorMessage="Factor must be a number greater than 0"
              className="scale-factor-input"
            />

            <FloatInputField
              id="voxel-size-input"
              label="Input desired voxel size:"
              value={form.voxelSizeText}
              onChange={form.setVoxelSizeText}
              isValid={form.parseVoxelSize() !== null}
              errorMessage="Voxel size must be a number greater than 0"
              className="voxel-size-input"
            />

            <UnitSelector
              value={form.modelUnits}
              onChange={form.setModelUnits}
            />

            <MaterialSelector
              materials={form.materials}
              selectedMaterial={form.selectedMaterial}
              onMaterialsChange={form.setMaterials}
              onSelectedChange={form.setSelectedMaterial}
            />
          </div>

          <DialogFooter isCreating={form.isCreating} onCancel={onClose} />
        </form>
      </div>
    </div>
  );
};
