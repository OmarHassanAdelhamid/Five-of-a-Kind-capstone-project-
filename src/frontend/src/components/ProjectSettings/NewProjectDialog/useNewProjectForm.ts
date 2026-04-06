/**
 * Form state, validation, and derived values for creating a project from an STL.
 *
 * @author Khalid Farag
 * @lastModified 2026/04/05
 */
import { useState, useEffect, useRef } from 'react';
import { fetchSTLDimensions } from '../../../utils/api';
import type { UnitOption, ConfirmPayload } from './types';

const DEFAULT_MATERIAL_IDS = [1, 2, 3];

// Props for the useNewProjectForm component
export const useNewProjectForm = (
  isOpen: boolean,
  stlFileName: string,
  initialMaterialIds: number[],
  onClose: () => void,
  onConfirm: (
    payload: ConfirmPayload,
    onProgress?: (message: string) => void,
  ) => void | Promise<void>,
) => {
  const [suffix, setSuffix] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const initialMaterialIdsRef = useRef(initialMaterialIds);
  initialMaterialIdsRef.current = initialMaterialIds;

  // Sets the model dimensions
  const [modelDimensions, setModelDimensions] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);

  const [modelUnits, setModelUnits] = useState<UnitOption>('mm');
  const [scaleFactor, setScaleFactor] = useState<string>('1');
  const [voxelSizeText, setVoxelSizeText] = useState<string>('1');
  const [materialIds, setMaterialIds] = useState<number[]>(
    initialMaterialIds.length ? [...initialMaterialIds].sort((a, b) => a - b) : [...DEFAULT_MATERIAL_IDS],
  );
  const [selectedMaterialId, setSelectedMaterialId] = useState<number>(
    initialMaterialIds[0] ?? 1,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('');

  // Sets the initial material ids
  useEffect(() => {
    if (isOpen) {
      if (inputRef.current) inputRef.current.focus();
      setSuffix('');
      const mats = initialMaterialIdsRef.current;
      setModelUnits('mm');
      setScaleFactor('1');
      setVoxelSizeText('1');
      const normalized =
        mats.length > 0
          ? [...new Set(mats.filter((id) => Number.isInteger(id) && id >= 1))].sort(
              (a, b) => a - b,
            )
          : [...DEFAULT_MATERIAL_IDS];
      setMaterialIds(normalized);
      setSelectedMaterialId(normalized[0] ?? 1);
    }
  }, [isOpen]);

  // Fetches the STL dimensions
  useEffect(() => {
    if (!isOpen || !stlFileName) return;

    const loadDimensions = async () => {
      try {
        const data = await fetchSTLDimensions(stlFileName);
        setModelDimensions(data.dimensions);
      } catch (error) {
        console.error('Failed to fetch STL dimensions', error);
        setModelDimensions(null);
      }
    };

    loadDimensions();
  }, [isOpen, stlFileName]);

  const baseName = stlFileName.replace('.stl', '');
  const fullProjectName = suffix.trim() ? `${baseName}-${suffix.trim()}` : baseName;

  // Parses the scale factor from the scale factor input
  const parseScaleFactor = (): number | null => {
    const n = Number(scaleFactor);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  };

  // Parses the voxel size from the voxel size input
  const parseVoxelSize = (): number | null => {
    const n = Number(voxelSizeText);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  };

  // Handles the submit event on the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sf = parseScaleFactor();
    if (sf === null) {
      alert('Please enter a valid scale factor (> 0).');
      return;
    }

    const vs = parseVoxelSize();
    if (vs === null) {
      alert('Please enter a valid voxel size (> 0).');
      return;
    }

    setIsCreating(true);
    setProgressMessage('Voxelizing model...');

    try {
      await onConfirm(
        {
          projectName: fullProjectName,
          modelUnits,
          scaleFactor: sf,
          voxelSize: vs,
          defaultMaterial: selectedMaterialId,
        },
        setProgressMessage,
      );
      onClose();
    } catch {
      // Error already shown by parent
    } finally {
      setIsCreating(false);
      setProgressMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isCreating) {
      onClose();
    }
  };

  return {
    inputRef,
    suffix,
    setSuffix,
    modelDimensions,
    modelUnits,
    setModelUnits,
    scaleFactor,
    setScaleFactor,
    voxelSizeText,
    setVoxelSizeText,
    materialIds,
    setMaterialIds,
    selectedMaterialId,
    setSelectedMaterialId,
    isCreating,
    progressMessage,
    baseName,
    parseScaleFactor,
    parseVoxelSize,
    handleSubmit,
    handleKeyDown,
  };
};
