interface CreatingProgressOverlayProps {
  message: string;
}

export const CreatingProgressOverlay = ({
  message,
}: CreatingProgressOverlayProps) => (
  <div className="dialog-progress-overlay">
    <div className="dialog-progress-spinner" />
    <p className="dialog-progress-message">{message}</p>
  </div>
);
