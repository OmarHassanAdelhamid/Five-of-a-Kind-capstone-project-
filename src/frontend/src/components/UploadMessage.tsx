interface UploadMessageProps {
  uploadState: 'idle' | 'uploading' | 'success' | 'error'
  message: string | null
}

export const UploadMessage = ({ uploadState, message }: UploadMessageProps) => {
  if (!message) {
    return null
  }

  return <p className={`upload-message ${uploadState}`}>{message}</p>
}

