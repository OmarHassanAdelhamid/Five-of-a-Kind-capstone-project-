import { useCallback, useEffect, useRef } from 'react';
import type { LayerResponse, LayerVoxel } from '../../utils/api';
import {
  drawGridCanvas,
  type VoxelPosition,
  type EmptyCellPosition,
} from './drawGridCanvas';
import { useGridInteraction } from './hooks/useGridInteraction';

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
}: Layer2DGridProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Position data populated by draw, consumed by interaction handlers
  const voxelPositionsRef = useRef<VoxelPosition[]>([]);
  const emptyCellPositionsRef = useRef<EmptyCellPosition[]>([]);

  const {
    hoveredIndex,
    hoveredEmpty,
    selectionMode,
    setSelectionMode,
    lassoPath,
    isDrawingLasso,
    zoom,
    mouseHandlers,
    handleWheel,
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
      cellColor,
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

  useEffect(() => {
    draw();
  }, [draw]);

  if (!layerData?.voxels?.length || !layerData.bounds) {
    return (
      <div className="layer-2d-grid-placeholder">
        Select a layer to view 2D grid
      </div>
    );
  }

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
          onWheel={handleWheel}
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
