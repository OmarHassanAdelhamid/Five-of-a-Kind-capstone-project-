import { useEffect, useRef, useState } from 'react';

type WelcomeStep = 'choice' | 'select-model' | 'select-project';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose?: () => void;
  availableModels: string[];
  availableProjects: string[];
  onSelectModel: (model: string) => void;
  onSelectProject: (project: string) => void;
  onCreateNewProject: () => void;
  onFileSelected: (file: File) => void;
}

export const WelcomeModal = ({
  isOpen,
  onClose,
  availableModels,
  availableProjects,
  onSelectModel,
  onSelectProject,
  onCreateNewProject,
  onFileSelected,
}: WelcomeModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<WelcomeStep>('choice');
  const [selectedModelForProjects, setSelectedModelForProjects] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (isOpen) {
      setStep('choice');
      setSelectedModelForProjects(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.stl')) {
      onFileSelected(file);
    } else if (file) {
      alert('Please select a file with the .stl extension.');
    }
    e.target.value = '';
  };

  const handleSelectExistingClick = () => {
    setStep('select-model');
  };

  const handleModelSelect = (model: string) => {
    setSelectedModelForProjects(model);
    onSelectModel(model);
    setStep('select-project');
  };

  const handleBackFromModels = () => {
    setStep('choice');
  };

  const handleBackFromProjects = () => {
    setSelectedModelForProjects(null);
    setStep('select-model');
  };

  const projectsForModel = selectedModelForProjects
    ? availableProjects.filter((project) =>
        project
          .toLowerCase()
          .includes(selectedModelForProjects.replace('.stl', '').toLowerCase()),
      )
    : [];

  const handleNewProjectClick = () => {
    if (selectedModelForProjects) {
      onSelectModel(selectedModelForProjects);
      onCreateNewProject();
    }
  };

  const handleProjectSelect = (project: string) => {
    // Don't set selectedModel when loading a project - we show voxels only, no STL overlay
    onSelectProject(project);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <div className="dialog-overlay welcome-modal-overlay">
        <div
          className="dialog-content welcome-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="dialog-header">
            <h3>Welcome to the Voxel Editor</h3>
            {onClose && (
              <button className="dialog-close" onClick={onClose} title="Close">
                ×
              </button>
            )}
          </div>
          <div className="welcome-modal-body">
            {step === 'choice' && (
              <div className="welcome-choice">
                <p className="welcome-prompt">
                  How would you like to get started?
                </p>
                <div className="welcome-buttons">
                  <button
                    type="button"
                    className="welcome-option-button"
                    onClick={handleImportClick}
                  >
                    <span className="welcome-option-icon">📤</span>
                    <span className="welcome-option-title">
                      Import a new STL file
                    </span>
                    <span className="welcome-option-desc">
                      Upload an STL file from your computer
                    </span>
                  </button>
                  <button
                    type="button"
                    className="welcome-option-button"
                    onClick={handleSelectExistingClick}
                  >
                    <span className="welcome-option-icon">📁</span>
                    <span className="welcome-option-title">
                      Select an existing STL file
                    </span>
                    <span className="welcome-option-desc">
                      Choose from previously uploaded models
                    </span>
                  </button>
                </div>
              </div>
            )}

            {step === 'select-model' && (
              <div className="welcome-select-model">
                <button
                  type="button"
                  className="welcome-back-button"
                  onClick={handleBackFromModels}
                >
                  ← Back
                </button>
                <p className="welcome-prompt">Select an STL file:</p>
                <div className="welcome-list">
                  {availableModels.length > 0 ? (
                    availableModels.map((model) => (
                      <button
                        key={model}
                        type="button"
                        className="welcome-list-item"
                        onClick={() => handleModelSelect(model)}
                      >
                        {model}
                      </button>
                    ))
                  ) : (
                    <p className="welcome-empty">
                      No STL files available. Import one first.
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 'select-project' && (
              <div className="welcome-select-project">
                <button
                  type="button"
                  className="welcome-back-button"
                  onClick={handleBackFromProjects}
                >
                  ← Back
                </button>
                <p className="welcome-prompt">
                  Projects for <strong>{selectedModelForProjects}</strong>
                </p>
                <div className="welcome-list">
                  <button
                    type="button"
                    className="welcome-list-item welcome-list-item-new"
                    onClick={handleNewProjectClick}
                  >
                    + New Project...
                  </button>
                  {projectsForModel.length > 0 && (
                    <div className="welcome-list-divider" />
                  )}
                  {projectsForModel.map((project) => (
                    <button
                      key={project}
                      type="button"
                      className="welcome-list-item"
                      onClick={() => handleProjectSelect(project)}
                    >
                      {project}
                    </button>
                  ))}
                  {projectsForModel.length === 0 && (
                    <p className="welcome-empty">
                      No projects yet. Create a new one.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
