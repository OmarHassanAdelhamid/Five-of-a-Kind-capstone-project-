// This component is used to display the status message of the model viewer (loading, ready, error)

// Props for the StatusMessage component
interface StatusMessageProps {
  status: 'loading' | 'ready' | 'error';
  message?: string | null;
  selectedModel?: string | null;
}

export const StatusMessage = ({
  status,
  message,
  selectedModel,
}: StatusMessageProps) => {
  // If the status is ready, return null
  if (status === 'ready') {
    return null;
  }

  // Display the message based on the status
  const displayMessage =
    status === 'loading'
      ? selectedModel
        ? `Loading ${selectedModel}…`
        : 'Loading project…'
      : message;

  return <div className={`status ${status}`}>{displayMessage}</div>;
};
