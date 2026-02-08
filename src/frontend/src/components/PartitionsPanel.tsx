import { useEffect, useState } from 'react';
import { fetchPartitions } from '../utils/api';

interface PartitionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string | null;
  selectedPartition: string | null;
  onPartitionSelect: (partitionName: string) => void;
}

export const PartitionsPanel = ({
  isOpen,
  onClose,
  projectName,
  selectedPartition,
  onPartitionSelect,
}: PartitionsPanelProps) => {
  const [partitions, setPartitions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && projectName) {
      setLoading(true);
      setError(null);
      fetchPartitions(projectName)
        .then((parts) => {
          setPartitions(parts);
          setLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load partitions');
          setPartitions([]);
          setLoading(false);
        });
    } else {
      setPartitions([]);
    }
  }, [isOpen, projectName]);

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
        {!projectName ? (
          <p className="empty-message">Select a project to view partitions</p>
        ) : loading ? (
          <p className="empty-message">Loading partitions...</p>
        ) : error ? (
          <p className="empty-message" style={{ color: '#ef4444' }}>
            {error}
          </p>
        ) : partitions.length === 0 ? (
          <p className="empty-message">No partitions found</p>
        ) : (
          <div className="partitions-list">
            {partitions.map((partition) => (
              <button
                key={partition}
                className={`partition-item ${
                  selectedPartition === partition ? 'selected' : ''
                }`}
                onClick={() => onPartitionSelect(partition)}
                title={partition}
              >
                {partition}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
