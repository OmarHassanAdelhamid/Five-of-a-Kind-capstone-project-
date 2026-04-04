import { useState, useEffect, useRef } from 'react';
import { fetchSTLDimensions } from '../../../utils/api';
import type { UnitOption, ConfirmPayload } from './types';

export const useNewProjectForm = (
  isOpen: boolean,
  stlFileName: string,
  initialMaterials: string[],
  onClose: () => void,
  onConfirm: (
    payload: ConfirmPayload,
    onProgress?: (message: string) => void,
  ) => void | Promise<void>,
) => {
  const [suffix, setSuffix] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const initialMaterialsRef = useRef(initialMaterials);
  initialMaterialsRef.current = initialMaterials;

  const [modelDimensions, setModelDimensions] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);

  const [modelUnits, setModelUnits] = useState<UnitOption>('mm');
  const [scaleFactor, setScaleFactor] = useState<string>('1');
  const [voxelSizeText, setVoxelSizeText] = useState<string>('1');
  const [materials, setMaterials] = useState<string[]>(initialMaterials);
  const [selectedMaterial, setSelectedMaterial] = useState<string>(
    initialMaterials[0] ?? 'material1',
  );
  const [isCreating, setIsCreating] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (inputRef.current) inputRef.current.focus();
      setSuffix('');
      const mats = initialMaterialsRef.current;
      setModelUnits('mm');
      setScaleFactor('1');
      setVoxelSizeText('1');
      setSelectedMaterial(mats[0] ?? 'material1');
      setMaterials(mats.length ? mats : ['material1', 'material2', 'material3']);
    }
  }, [isOpen]);

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

  const parseScaleFactor = (): number | null => {
    const n = Number(scaleFactor);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  };

  const parseVoxelSize = (): number | null => {
    const n = Number(voxelSizeText);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  };

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
          defaultMaterial: selectedMaterial,
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
    materials,
    setMaterials,
    selectedMaterial,
    setSelectedMaterial,
    isCreating,
    progressMessage,
    baseName,
    parseScaleFactor,
    parseVoxelSize,
    handleSubmit,
    handleKeyDown,
  };
};
