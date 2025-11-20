import type { ChangeEvent } from 'react'

interface ModelSelectorProps {
  models: string[]
  selectedModel: string | null
  onModelChange: (model: string) => void
  disabled?: boolean
}

export const ModelSelector = ({
  models,
  selectedModel,
  onModelChange,
  disabled,
}: ModelSelectorProps) => {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    if (value) {
      onModelChange(value)
    }
  }

  return (
    <div className="model-selector">
      <label htmlFor="model-select">Active model</label>
      <select
        id="model-select"
        value={selectedModel ?? ''}
        onChange={handleChange}
        disabled={disabled || models.length === 0}
      >
        {models.length === 0 && <option value="">No models available</option>}
        {models.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>
    </div>
  )
}

