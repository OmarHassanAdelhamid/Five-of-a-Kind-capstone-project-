// This component is used to display the dialog footer (cancel, create project)

// Props for the DialogFooter component
interface DialogFooterProps {
  isCreating: boolean;
  onCancel: () => void;
}

export const DialogFooter = ({ isCreating, onCancel }: DialogFooterProps) => (
  <div className="dialog-footer">
    <button
      type="button"
      onClick={onCancel}
      className="dialog-button-cancel"
      disabled={isCreating}
    >
      Cancel
    </button>
    <button
      type="submit"
      className="dialog-button-confirm"
      disabled={isCreating}
    >
      {isCreating ? 'Creating…' : 'Create Project'}
    </button>
  </div>
);
