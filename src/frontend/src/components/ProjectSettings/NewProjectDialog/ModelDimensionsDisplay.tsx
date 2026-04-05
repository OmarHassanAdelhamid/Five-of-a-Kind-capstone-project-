// This component is used to display the model dimensions (x, y, z)

// Props for the ModelDimensionsDisplay component
interface ModelDimensionsDisplayProps {
  dimensions: { x: number; y: number; z: number } | null;
}

export const ModelDimensionsDisplay = ({
  dimensions,
}: ModelDimensionsDisplayProps) => (
  <div className="dialog-section">
    <p className="dialog-section-title">STL bounds (model units)</p>
    {dimensions ? (
      <p className="dialog-dimensions-value" aria-live="polite">
        {dimensions.x} × {dimensions.y} × {dimensions.z}
      </p>
    ) : (
      <p className="dialog-hint dialog-hint--subtle">Loading dimensions…</p>
    )}
  </div>
);
