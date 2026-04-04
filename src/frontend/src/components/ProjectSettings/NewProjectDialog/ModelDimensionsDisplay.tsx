interface ModelDimensionsDisplayProps {
  dimensions: { x: number; y: number; z: number } | null;
}

export const ModelDimensionsDisplay = ({
  dimensions,
}: ModelDimensionsDisplayProps) => (
  <>
    <p className="dialog-hint-white">
      <strong> Current dimensions: </strong>
    </p>
    {dimensions && (
      <p className="dialog-hint-white">
        {dimensions.x} × {dimensions.y} × {dimensions.z}
      </p>
    )}
  </>
);
