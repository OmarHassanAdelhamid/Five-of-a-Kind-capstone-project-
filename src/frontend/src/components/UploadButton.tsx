import type { ChangeEvent } from 'react'

interface UploadButtonProps {
  uploadState: 'idle' | 'uploading' | 'success' | 'error'
  onUpload: (file: File) => void
}

export const UploadButton = ({ uploadState, onUpload }: UploadButtonProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.name.toLowerCase().endsWith('.stl')) {
      event.target.value = ''
      return
    }

    onUpload(file)
    event.target.value = ''
  }

  return (
    <label className={`upload-button ${uploadState}`}>
      <input
        type="file"
        accept=".stl"
        onChange={handleChange}
        disabled={uploadState === 'uploading'}
      />
      <span>{uploadState === 'uploading' ? 'Uploading…' : 'Upload STL File'}</span>
    </label>
  )
}

