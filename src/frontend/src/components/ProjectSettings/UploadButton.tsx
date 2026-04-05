// This component is used to display the upload button (upload a STL file)
import type { ChangeEvent } from 'react';

// Props for the UploadButton component
interface UploadButtonProps {
  uploadState: 'idle' | 'uploading' | 'success' | 'error';
  onUpload: (file: File) => void;
}

export const UploadButton = ({ uploadState, onUpload }: UploadButtonProps) => {
  // Handles the change event on the upload input
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.stl')) {
      event.target.value = '';
      return;
    }

    onUpload(file);
    event.target.value = '';
  };

  return (
    <label className={`upload-button ${uploadState}`}>
      <input
        id="stl-upload-input"
        type="file"
        accept=".stl"
        onChange={handleChange}
        disabled={uploadState === 'uploading'}
      />
      <span>
        {uploadState === 'uploading' ? 'Uploading…' : 'Upload STL File'}
      </span>
    </label>
  );
};
