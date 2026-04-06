/**
 * Footer strip for secondary status and metadata.
 *
 * @author Andrew Bovbel
 * @lastModified 2026/04/05
 */
interface FooterProps {
  hasVoxels?: boolean;
}

export const Footer = ({ hasVoxels = false }: FooterProps) => {
  return (
    <>
      <div className="viewer-instructions">
        <p className="instruction-text">
          {hasVoxels ? (
            <>
              <strong>Click</strong> to select layer (opens Layer Editor) •{' '}
              <strong>Ctrl/Cmd+Click</strong> to select multiple voxels
            </>
          ) : (
            <>
              <strong>Ctrl/Cmd+Click</strong> to select multiple voxels
            </>
          )}
        </p>
      </div>
    </>
  );
};
