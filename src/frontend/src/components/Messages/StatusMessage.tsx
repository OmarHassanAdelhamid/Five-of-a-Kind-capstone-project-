/**
 * Primary status message shown under the main toolbar.
 *
 * @author Khalid Farag, Andrew Bovbel
 * @lastModified 2026/04/05
 */
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
