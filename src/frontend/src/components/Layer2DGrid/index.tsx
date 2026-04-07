/**
 * 2D layer viewport: wires canvas drawing and interaction hooks to the layer editor.
 *
 * @author Khalid Farag
 * @lastModified 2026/04/03
 */
import { use, useCallback, useEffect, useRef, useState } from 'react';
import type { LayerResponse, LayerVoxel } from '../../utils/api';
import { DEFAULT_LAYER_MATERIALS } from '../LayerEditor/layerMaterialsDefaults';
import {
  drawGridCanvas,
  type VoxelPosition,
  type EmptyCellPosition,
} from './drawGridCanvas';
import { useGridInteraction } from './hooks/useGridInteraction';

// Props for the Layer2DGrid component
interface Layer2DGridProps {
  layerData: LayerResponse | null;
  width?: number;
  height?: number;
  materialColors?: Record<number, string>;
  cellColor?: string;
  selectedCellColor?: string;
  backgroundColor?: string;
  onVoxelSelect?: (voxel: LayerVoxel | null, index: number) => void;
  onVoxelsSelect?: (voxels: LayerVoxel[], indices: number[]) => void;
  selectedVoxelIndices?: Set<number>;
  editVoxelsMode?: boolean;
  onVoxelAdd?: (gridX: number, gridY: number) => void;
  onVoxelRemove?: (index: number) => void;
  onVoxelsAdd?: (cells: { gridX: number; gridY: number }[]) => void;
  onVoxelsRemove?: (indices: number[]) => void;
  onLayerUp?: () => void;
  onLayerDown?: () => void;
  canGoUp?: boolean;
  canGoDown?: boolean;
  defaultMaterial?: number;
}

export const Layer2DGrid = ({
  layerData,
  width = 550,
  height = 500,
  materialColors = {},
  cellColor = '#60a5fa',
  selectedCellColor = '#facc15',
  backgroundColor = '#1e293b',
  onVoxelSelect,
  onVoxelsSelect,
  selectedVoxelIndices = new Set(),
  editVoxelsMode = false,
  onVoxelAdd,
  onVoxelRemove,
  onVoxelsAdd,
  onVoxelsRemove,
  onLayerUp,
  onLayerDown,
  canGoUp = false,
  canGoDown = false,
  defaultMaterial,
}: Layer2DGridProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Position data populated by draw and consumed by interaction handlers
  const voxelPositionsRef = useRef<VoxelPosition[]>([]);
  const emptyCellPositionsRef = useRef<EmptyCellPosition[]>([]);
  const [cellDefaultColor, setCellDefaultColor] = useState<string>(cellColor);

  // Interaction handlers
  const {
    hoveredIndex,
    hoveredEmpty,
    selectionMode,
    setSelectionMode,
    lassoPath,
    isDrawingLasso,
    zoom,
    mouseHandlers,
  } = useGridInteraction({
    canvasRef,
    voxelPositionsRef,
    emptyCellPositionsRef,
    editVoxelsMode,
    onVoxelSelect,
    onVoxelsSelect,
    onVoxelAdd,
    onVoxelRemove,
    onVoxelsAdd,
    onVoxelsRemove,
  });

  useEffect(() => {
    setCellDefaultColor(
      defaultMaterial != null
        ? materialColors[defaultMaterial] || cellColor
        : cellColor,
    );
  }, [defaultMaterial, materialColors, cellColor]);

  // Draws the grid onto the canvas using the drawGridCanvas function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layerData?.bounds) return;
    drawGridCanvas({
      canvas,
      layerData,
      width,
      height,
      zoom,
      materialColors,
      cellColor: cellDefaultColor,
      selectedCellColor,
      backgroundColor,
      selectedVoxelIndices,
      hoveredIndex,
      hoveredEmpty,
      editVoxelsMode,
      lassoPath,
      isDrawingLasso,
      voxelPositionsOut: voxelPositionsRef.current,
      emptyCellPositionsOut: emptyCellPositionsRef.current,
    });
  }, [
    layerData,
    width,
    height,
    zoom,
    materialColors,
    cellColor,
    selectedCellColor,
    backgroundColor,
    selectedVoxelIndices,
    hoveredIndex,
    hoveredEmpty,
    editVoxelsMode,
    lassoPath,
    isDrawingLasso,
  ]);

  // Draws the grid onto the canvas when the component mounts or when the layer data changes
  useEffect(() => {
    draw();
  }, [draw]);

  // If there is no layer data, return a placeholder
  if (!layerData?.voxels?.length || !layerData.bounds) {
    return (
      <div className="layer-2d-grid-placeholder">
        Select a layer to view 2D grid
      </div>
    );
  }

  // If there is layer data, return the grid
  return (
    <div className="layer-2d-grid-wrapper">
      <div className="layer-2d-grid-toolbar">
        <button
          type="button"
          className={`layer-2d-tool-btn ${selectionMode === 'click' ? 'active' : ''}`}
          onClick={() => setSelectionMode('click')}
          title="Click to select single voxel"
        >
          Click
        </button>
        <button
          type="button"
          className={`layer-2d-tool-btn ${selectionMode === 'lasso' ? 'active' : ''}`}
          onClick={() => setSelectionMode('lasso')}
          title={
            editVoxelsMode
              ? 'Draw lasso to add empty cells (green) and remove voxels (red)'
              : 'Draw lasso to select multiple voxels'
          }
        >
          Lasso
        </button>
      </div>
      <div className="layer-2d-grid-canvas-container">
        {(onLayerUp != null || onLayerDown != null) && (
          <div className="layer-2d-grid-nav-buttons">
            <button
              type="button"
              className="layer-nav-btn"
              onClick={onLayerUp}
              disabled={!canGoUp}
              title="Higher layer"
            >
              ↑
            </button>
            <button
              type="button"
              className="layer-nav-btn"
              onClick={onLayerDown}
              disabled={!canGoDown}
              title="Lower layer"
            >
              ↓
            </button>
          </div>
        )}
        <div
          className="layer-2d-grid-zoom-wrapper"
          style={{ transform: `scale(${zoom})`, transformOrigin: '50% 50%' }}
        >
          <canvas
            ref={canvasRef}
            className="layer-2d-grid-canvas"
            width={width}
            height={height}
            style={{
              display: 'block',
              borderRadius: '8px',
              cursor: selectionMode === 'lasso' ? 'crosshair' : 'pointer',
            }}
            {...mouseHandlers}
          />
        </div>
        {hoveredIndex !== null && voxelPositionsRef.current[hoveredIndex] && (
          <div className="layer-2d-grid-tooltip">
            Voxel #{hoveredIndex} (
            {voxelPositionsRef.current[hoveredIndex].voxel.x.toFixed(2)},
            {voxelPositionsRef.current[hoveredIndex].voxel.y.toFixed(2)},
            {voxelPositionsRef.current[hoveredIndex].voxel.z.toFixed(2)})
            {editVoxelsMode && ' • Left-click to remove'}
          </div>
        )}
        {editVoxelsMode && hoveredEmpty && (
          <div className="layer-2d-grid-tooltip">
            Empty cell ({hoveredEmpty.gridX}, {hoveredEmpty.gridY}) •
            Right-click to add voxel
          </div>
        )}
      </div>
    </div>
  );
};
