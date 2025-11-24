import { API_BASE_URL } from '../utils/constants'

interface FooterProps {
  modelsCount: number
  selectedModel: string | null
}

export const Footer = ({ modelsCount, selectedModel }: FooterProps) => {
  return (
    <footer>
      <div className="metadata">
        <span>
          Backend API:&nbsp;
          <code>{API_BASE_URL}</code>
        </span>
        <span>
          Models:&nbsp;
          <code>{modelsCount}</code>
        </span>
        <span>
          Active:&nbsp;
          <code>{selectedModel ?? 'None'}</code>
        </span>
      </div>
    </footer>
  )
}

