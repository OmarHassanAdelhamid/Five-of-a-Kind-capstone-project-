// This dialog is used to warn the user about the issues that were found during the export process

// Props for the ExportWarningDialog component
interface ExportWarningDialogProps {
  warnings: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const ExportWarningDialog = ({
  warnings,
  onConfirm,
  onCancel,
}: ExportWarningDialogProps) => {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>⚠ Export Warning</h3>
        </div>

        <div className="dialog-body" style={{ padding: '20px' }}>
          <p style={{ color: '#e2e8f0', marginBottom: '12px' }}>
            The following issues were found. Are you sure you want to export
            anyway?
          </p>
          <ul style={{ color: '#fbbf24', paddingLeft: '20px', margin: 0 }}>
            {warnings.map((w, i) => (
              <li key={i} style={{ marginBottom: '6px' }}>
                {w}
              </li>
            ))}
          </ul>
        </div>

        <div className="dialog-footer">
          <button className="dialog-button-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="dialog-button-confirm"
            style={{ background: '#f59e0b', color: '#1e1e1e' }}
            onClick={onConfirm}
          >
            Export Anyway
          </button>
        </div>
      </div>
    </div>
  );
};
