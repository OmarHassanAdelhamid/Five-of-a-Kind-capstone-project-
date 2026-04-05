// This component is used to display the dialog header (new project, close)

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
