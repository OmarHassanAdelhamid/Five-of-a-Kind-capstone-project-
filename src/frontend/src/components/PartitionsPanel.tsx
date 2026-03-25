import { useEffect, useState } from 'react';
import { fetchPartitions } from '../utils/api';
import { PartitionGrid } from './PartitionGrid';
import type { Partition } from '../utils/api'

interface PartitionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string | null;
  selectedPartition: string | null;
  onPartitionSelect: (partitionName: string) => void;
}

function parsePartitionName(name: string): Partition | null {
  const match = name.match(/partition-x-(-?\d+)-y-(-?\d+)-z-(-?\d+)\.db$/);
  if (!match) return null;

  return {
    name,
    label: name,
    x: Number(match[1]),
    y: Number(match[2]),
    z: Number(match[3]),
  };
}

export const PartitionsPanel = ({
  isOpen,
  onClose,
  projectName,
  selectedPartition,
  onPartitionSelect,
}: PartitionsPanelProps) => {
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingPartition, setEditingPartition] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    if (isOpen && projectName) {
      setLoading(true);
      setError(null);
      fetchPartitions(projectName)
        .then((parts) => {
          const parsedPartitions = parts
            .map(parsePartitionName)
            .filter((p): p is Partition => p !== null);

          setPartitions(parsedPartitions);
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

  const normalizePartitionName = (value: string) => {
    const trimmed = value.trim();
  
    if (!trimmed) return '';
  
    return trimmed.toLowerCase().endsWith('.db')
      ? trimmed
      : `${trimmed}.db`;
  };

  const handleRenamePartition = async (oldName: string, newName: string) => {
    const normalizedName = normalizePartitionName(newName);

  if (!normalizedName) {
    setEditingPartition(null);
    setEditedName('');
    return;
  }

    try {
      setPartitions((prev) =>
        prev.map((partition) =>
          partition.name === oldName
            ? {
                ...partition,
                name: normalizedName,
                label: normalizedName,
              }
            : partition
        )
      );

      if (selectedPartition === oldName) {
        onPartitionSelect(normalizedName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename partition');
    } finally {
      setEditingPartition(null);
      setEditedName('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="partitions-panel open">
      <div className="partitions-panel-header">
        <h3>Partitions</h3>
        <button onClick={onClose} className="close-button" title="Close">
          ×
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
        <PartitionGrid
          partitions={partitions}
          selectedPartition={selectedPartition}
          onPartitionSelect={onPartitionSelect}
        />
      </div>
      <div>
      <p className="edit-partition-labels">Double click to change partition name</p>
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
              <div key={partition.name} className="partition-row">
                {editingPartition === partition.name ? (
                  <input
                    className="partition-item partition-edit-input"
                    value={editedName}
                    autoFocus
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={() => handleRenamePartition(partition.name, editedName)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRenamePartition(partition.name, editedName);
                      } else if (e.key === 'Escape') {
                        setEditingPartition(null);
                        setEditedName('');
                      }
                    }}
                  />
                ) : (
                  <button
                    className={`partition-item ${
                      selectedPartition === partition.name ? 'selected' : ''
                    }`}
                    onClick={() => onPartitionSelect(partition.name)}
                    onDoubleClick={() => {
                      setEditingPartition(partition.name);
                      setEditedName(partition.label);
                    }}
                    title={partition.label}
                  >
                    {partition.label}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};