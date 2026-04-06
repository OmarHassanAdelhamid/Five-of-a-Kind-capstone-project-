/**
 * Blocking overlay with progress text while a new project is being created.
 *
 * @author Khalid Farag
 * @lastModified 2026/04/05
 */
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
