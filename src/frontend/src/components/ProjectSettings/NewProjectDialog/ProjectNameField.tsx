/**
 * Project name input for the new-project dialog.
 *
 * @author Olivia Reich
 * @lastModified 2026/04/05
 */
import type { RefObject } from 'react';

// Props for the ProjectNameField component
interface ProjectNameFieldProps {
  baseName: string;
  suffix: string;
  onSuffixChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: RefObject<HTMLInputElement>;
}

export const ProjectNameField = ({
  baseName,
  suffix,
  onSuffixChange,
  onKeyDown,
  inputRef,
}: ProjectNameFieldProps) => (
  <div className="dialog-section">
    <p className="dialog-section-title" id="project-name-label">
      Project name
    </p>
    <div
      className="project-name-input-wrapper"
      role="group"
      aria-labelledby="project-name-label"
    >
      <span className="project-name-prefix">{baseName}-</span>
      <input
        ref={inputRef}
        id="project-name-input"
        type="text"
        value={suffix}
        onChange={(e) => onSuffixChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="project-suffix"
        autoFocus
        aria-describedby="project-name-preview"
      />
    </div>
    <p className="dialog-hint dialog-hint--subtle" id="project-name-preview">
      Full name:{' '}
      <strong className="dialog-hint-mono">
        {baseName}-{suffix || 'project-suffix'}
      </strong>
    </p>
  </div>
);
