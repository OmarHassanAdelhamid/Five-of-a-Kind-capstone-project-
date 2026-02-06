interface StatusMessageProps {
  status: 'loading' | 'ready' | 'error'
  message?: string | null
  selectedModel?: string | null
}

export const StatusMessage = ({
  status,
  message,
  selectedModel,
}: StatusMessageProps) => {
  if (status === 'ready') {
    return null
  }

  const displayMessage =
    status === 'loading'
      ? selectedModel
        ? `Loading ${selectedModel}…`
        : 'Loading project…'
      : message

  return (
    <div className={`status ${status}`}>
      {displayMessage}
    </div>
  )
}

