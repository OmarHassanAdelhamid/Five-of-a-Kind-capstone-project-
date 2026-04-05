// This component is used to display the model selector (select a model from the list of available models)
import type { ChangeEvent } from 'react';

// Props for the ModelSelector component
interface ModelSelectorProps {
  models: string[];
  selectedModel: string | null;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

export const ModelSelector = ({
  models,
  selectedModel,
  onModelChange,
  disabled,
}: ModelSelectorProps) => {
  // Handles the change event on the model select
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value) {
      onModelChange(value);
    }
  };

  return (
    <div className="project-settings-block model-selector">
      <label className="project-settings-label" htmlFor="model-select">
        Active model (STL)
      </label>
      <select
        id="model-select"
        value={selectedModel ?? ''}
        onChange={handleChange}
        disabled={disabled || models.length === 0}
        className="project-settings-select project-settings-select--full"
      >
        {models.length === 0 && <option value="">No models available</option>}
        {models.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>
    </div>
  );
};
