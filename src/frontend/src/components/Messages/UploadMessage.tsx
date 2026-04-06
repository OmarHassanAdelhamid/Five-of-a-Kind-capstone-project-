/**
 * Inline upload progress and result messaging for STL imports.
 *
 * @author Andrew Bovbel
 * @lastModified 2026/04/05
 */
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
