import { useState, useEffect, useRef } from 'react';

interface NewProjectDialogProps {
  isOpen: boolean;
  stlFileName: string;
  onClose: () => void;
  onConfirm: (projectName: string) => void;
}

export const NewProjectDialog = ({
  isOpen,
  stlFileName,
  onClose,
  onConfirm,
}: NewProjectDialogProps) => {
  const [suffix, setSuffix] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSuffix(''); // Reset suffix when dialog opens
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const baseName = stlFileName.replace('.stl', '');
    const projectName = suffix.trim() ? `${baseName}-${suffix.trim()}` : baseName;
    onConfirm(projectName);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const baseName = stlFileName.replace('.stl', '');

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>New Project</h3>
          <button className="dialog-close" onClick={onClose} title="Close">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            <label htmlFor="project-name-input">Project Name:</label>
            <div className="project-name-input-wrapper">
              <span className="project-name-prefix">{baseName}-</span>
              <input
                ref={inputRef}
                id="project-name-input"
                type="text"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="project-suffix"
                autoFocus
              />
            </div>
            <p className="dialog-hint">
              Full project name: <strong>{baseName}-{suffix || 'project-suffix'}</strong>
            </p>
          </div>
          <div className="dialog-footer">
            <button type="button" onClick={onClose} className="dialog-button-cancel">
              Cancel
            </button>
            <button type="submit" className="dialog-button-confirm">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
