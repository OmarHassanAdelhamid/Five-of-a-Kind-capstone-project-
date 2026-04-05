// This component is used to display the upload message of the model viewer (idle, uploading, success, error)

// Props for the UploadMessage component
interface UploadMessageProps {
  uploadState: 'idle' | 'uploading' | 'success' | 'error';
  message: string | null;
}

export const UploadMessage = ({ uploadState, message }: UploadMessageProps) => {
  if (!message) {
    return null;
  }

  return <p className={`upload-message ${uploadState}`}>{message}</p>;
};
