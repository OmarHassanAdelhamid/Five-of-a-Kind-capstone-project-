import type { RefObject } from 'react';

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
  <>
    <label htmlFor="project-name-input">Project Name:</label>
    <div className="project-name-input-wrapper">
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
      />
    </div>
    <p className="dialog-hint">
      Full project name:{' '}
      <strong>
        {baseName}-{suffix || 'project-suffix'}
      </strong>
    </p>
  </>
);
