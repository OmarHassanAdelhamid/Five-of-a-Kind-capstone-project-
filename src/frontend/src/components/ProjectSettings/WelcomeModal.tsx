/**
 * First-run / welcome modal with shortcuts to create or open a project.
 *
 * @author Khalid Farag, Olivia Reich
 * @lastModified 2026/04/05
 */
import { useEffect, useRef, useState } from 'react';

type WelcomeStep =
  | 'choice'
  | 'select-model'
  | 'select-project'
  | 'select-previous'
  | 'select-file';

// Props for the WelcomeModal component
interface WelcomeModalProps {
  isOpen: boolean;
  initialStep?: WelcomeStep;
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
  initialStep = 'choice',
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

  // Sets the step and the selected model for projects when the modal is opened
  useEffect(() => {
    if (isOpen) {
      setStep(initialStep);
      setSelectedModelForProjects(null);
    }
  }, [isOpen, initialStep]);

  // Handles the click on the import button
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  // Handles the change event on the file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.stl')) {
      onFileSelected(file);
    } else if (file) {
      alert('Please select a file with the .stl extension.');
    }
    e.target.value = '';
  };

  // Handles the click on the select existing button
  const handleSelectExistingClick = () => {
    setStep('select-model');
  };

  // Handles the click on the select previous project button
  const handleSelectPrevProject = () => {
    setStep('select-previous');
  };

  // Handles the click on the model select button
  const handleModelSelect = (model: string) => {
    setSelectedModelForProjects(model);
    onSelectModel(model);
    setStep('select-project');
  };

  // Handles the click on the back from models button
  const handleBackFromModels = () => {
    setStep('choice');
  };

  // Handles the click on the back from projects button
  const handleBackFromProjects = () => {
    setSelectedModelForProjects(null);
    setStep('select-model');
  };

  // Gets all the projects for the selected model
  const allProjects = availableProjects;
  const projectsForModel = selectedModelForProjects
    ? availableProjects.filter((project) =>
        project
          .toLowerCase()
          .includes(selectedModelForProjects.replace('.stl', '').toLowerCase()),
      )
    : [];

  // Handles the click on the new project button
  const handleNewProjectClick = () => {
    if (selectedModelForProjects) {
      onSelectModel(selectedModelForProjects);
      onCreateNewProject();
    }
  };

  // Handles the click on the project select button
  const handleProjectSelect = (project: string) => {
    // Don't set selectedModel when loading a project,we show voxels only, no STL overlay
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
            <h3>Voxelized Project</h3>
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
                    <span className="welcome-option-title">Import New STL</span>
                    <span className="welcome-option-desc">
                      Upload new STL file from your computer to start
                    </span>
                  </button>
                  <button
                    type="button"
                    className="welcome-option-button"
                    onClick={handleSelectExistingClick}
                  >
                    <span className="welcome-option-icon">📁</span>
                    <span className="welcome-option-title">New Project</span>
                    <span className="welcome-option-desc">
                      Open new project from previously uploaded stl models
                    </span>
                  </button>
                  <button
                    type="button"
                    className="welcome-option-button"
                    onClick={handleSelectPrevProject}
                  >
                    <span className="welcome-option-icon">📄</span>
                    <span className="welcome-option-title">
                      Previous Project
                    </span>
                    <span className="welcome-option-desc">
                      Reopen a previous voxelized project
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

                <button
                  type="button"
                  className="welcome-list-item welcome-list-item-new welcome-list-item--centered"
                  onClick={handleNewProjectClick}
                >
                  Create New Project
                </button>

                <div className="welcome-list-divider" />
                <div className="welcome-list">
                  <p className="welcome-prompt">
                    Reopen Previous Project for{' '}
                    <strong>{selectedModelForProjects}</strong>
                  </p>
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
                    <p className="welcome-empty">No projects yet.</p>
                  )}
                </div>
              </div>
            )}

            {step === 'select-previous' && (
              <div className="welcome-select-project">
                <button
                  type="button"
                  className="welcome-back-button"
                  onClick={handleBackFromModels}
                >
                  ← Back
                </button>
                <div className="welcome-list">
                  {allProjects.length === 0 && (
                    <p className="welcome-empty">No projects yet.</p>
                  )}

                  {allProjects.map((project) => (
                    <button
                      key={project}
                      type="button"
                      className="welcome-list-item"
                      onClick={() => handleProjectSelect(project)}
                    >
                      {project}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="welcome-list-item welcome-list-item-new welcome-list-item--centered"
                    onClick={handleSelectExistingClick}
                  >
                    Create New Project
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
