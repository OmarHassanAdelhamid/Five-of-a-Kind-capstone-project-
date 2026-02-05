interface PartitionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PartitionsPanel = ({ isOpen, onClose }: PartitionsPanelProps) => {
  if (!isOpen) return null;

  return (
    <div className="partitions-panel open">
      <div className="partitions-panel-header">
        <h3>Partitions</h3>
        <button onClick={onClose} className="close-button" title="Close">
          ×
        </button>
      </div>
      <div className="partitions-panel-content">
        <p className="empty-message">Partition coming soon</p>
      </div>
    </div>
  );
};
