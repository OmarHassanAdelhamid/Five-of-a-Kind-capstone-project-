/**
 * Title/header region for the new-project dialog.
 *
 * @author Khalid Farag, Olivia Reich
 * @lastModified 2026/04/05
 */
interface DialogHeaderProps {
  isCreating: boolean;
  onClose: () => void;
}

export const DialogHeader = ({ isCreating, onClose }: DialogHeaderProps) => (
  <div className="dialog-header">
    <h3>New Project</h3>
    {!isCreating && (
      <button className="dialog-close" onClick={onClose} title="Close">
        ×
      </button>
    )}
  </div>
);
