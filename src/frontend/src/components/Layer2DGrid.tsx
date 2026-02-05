import { useEffect, useRef, useState, useCallback } from 'react';
import type { LayerResponse, LayerVoxel } from '../utils/api';

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
  onLayerUp?: () => void;
  onLayerDown?: () => void;
  canGoUp?: boolean;
  canGoDown?: boolean;
}

function isPointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
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
  onLayerUp,
  onLayerDown,
  canGoUp = false,
  canGoDown = false,
}: Layer2DGridProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState<'click' | 'lasso'>('click');
  const [lassoPath, setLassoPath] = useState<{ x: number; y: number }[]>([]);
  const [isDrawingLasso, setIsDrawingLasso] = useState(false);
  const lassoPathRef = useRef<{ x: number; y: number }[]>([]);

  const voxelPositionsRef = useRef<
    Array<{ x: number; y: number; w: number; h: number; voxel: LayerVoxel; index: number }>
  >([]);

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const draw = useCallback(() => {
    if (!layerData?.voxels?.length || !layerData.bounds) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { bounds, voxels } = layerData;
    const padding = 30;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;
    const gridCountX = Math.max(1, bounds.grid_x_max - bounds.grid_x_min + 1);
    const gridCountY = Math.max(1, bounds.grid_y_max - bounds.grid_y_min + 1);
    const gapRatio = 0.85;
    const cellW = Math.max(4, (drawWidth / gridCountX) * gapRatio);
    const cellH = Math.max(4, (drawHeight / gridCountY) * gapRatio);
    const cellSize = Math.min(cellW, cellH, 25);

    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    voxelPositionsRef.current = [];

    const actualDrawWidth = gridCountX * (cellSize / gapRatio);
    const actualDrawHeight = gridCountY * (cellSize / gapRatio);
    const offsetX = padding + (drawWidth - actualDrawWidth) / 2;
    const offsetY = padding + (drawHeight - actualDrawHeight) / 2;

    for (let i = 0; i < voxels.length; i++) {
      const v = voxels[i];
      const gridX = (v.grid_x ?? 0) - bounds.grid_x_min;
      const gridY = (v.grid_y ?? 0) - bounds.grid_y_min;
      const pixelX = offsetX + (gridX + 0.5) * (cellSize / gapRatio) - cellSize / 2;
      const pixelY =
        height - offsetY - (gridY + 0.5) * (cellSize / gapRatio) - cellSize / 2;

      voxelPositionsRef.current.push({
        x: pixelX,
        y: pixelY,
        w: cellSize,
        h: cellSize,
        voxel: v,
        index: i,
      });

      const materialId = v.material ?? 1;
      const materialColor = materialColors[materialId] ?? cellColor;
      const isSelected = selectedVoxelIndices.size > 0 && selectedVoxelIndices.has(i);
      let fillColor = isSelected ? selectedCellColor : materialColor;
      if (hoveredIndex === i && !isSelected) fillColor = materialColor;

      ctx.fillStyle = fillColor;
      ctx.fillRect(pixelX, pixelY, cellSize, cellSize);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(pixelX, pixelY, cellSize, cellSize);
      if (isSelected) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.strokeRect(pixelX - 1, pixelY - 1, cellSize + 2, cellSize + 2);
      }
    }

    if (lassoPath.length > 1) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(lassoPath[0].x, lassoPath[0].y);
      for (let i = 1; i < lassoPath.length; i++) {
        ctx.lineTo(lassoPath[i].x, lassoPath[i].y);
      }
      if (isDrawingLasso) {
        ctx.stroke();
      } else {
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.fill();
      }
      ctx.setLineDash([]);
    }
  }, [
    layerData,
    width,
    height,
    materialColors,
    cellColor,
    selectedCellColor,
    backgroundColor,
    selectedVoxelIndices,
    hoveredIndex,
    lassoPath,
    isDrawingLasso,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getVoxelAtPosition = (clientX: number, clientY: number) => {
    const coords = getCanvasCoords(clientX, clientY);
    if (!coords) return null;
    const { x, y } = coords;
    for (const pos of voxelPositionsRef.current) {
      if (x >= pos.x && x <= pos.x + pos.w && y >= pos.y && y <= pos.y + pos.h) {
        return pos;
      }
      const centerX = pos.x + pos.w / 2;
      const centerY = pos.y + pos.h / 2;
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      if (distance < 20) return pos;
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;
    if (selectionMode === 'lasso') {
      setIsDrawingLasso(true);
      lassoPathRef.current = [coords];
      setLassoPath([coords]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;
    if (isDrawingLasso && selectionMode === 'lasso') {
      const prev = lassoPathRef.current;
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const dist = Math.hypot(coords.x - last.x, coords.y - last.y);
        if (dist > 5) {
          const next = [...prev, coords];
          lassoPathRef.current = next;
          setLassoPath(next);
        }
      }
    } else {
      const hit = getVoxelAtPosition(e.clientX, e.clientY);
      setHoveredIndex(hit ? hit.index : null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawingLasso && selectionMode === 'lasso') {
      setIsDrawingLasso(false);
      const path = lassoPathRef.current;
      if (path.length >= 3) {
        const polygon = [...path];
        const selected: { voxel: LayerVoxel; index: number }[] = [];
        for (const pos of voxelPositionsRef.current) {
          const centerX = pos.x + pos.w / 2;
          const centerY = pos.y + pos.h / 2;
          if (isPointInPolygon(centerX, centerY, polygon)) {
            selected.push({ voxel: pos.voxel, index: pos.index });
          }
        }
        if (selected.length > 0) {
          if (onVoxelsSelect) {
            onVoxelsSelect(
              selected.map((s) => s.voxel),
              selected.map((s) => s.index),
            );
          } else if (onVoxelSelect && selected.length === 1) {
            onVoxelSelect(selected[0].voxel, selected[0].index);
          }
        } else if (onVoxelSelect) {
          onVoxelSelect(null, -1);
        }
      } else if (path.length === 1 && onVoxelSelect) {
        const hit = getVoxelAtPosition(e.clientX, e.clientY);
        if (hit) onVoxelSelect(hit.voxel, hit.index);
      }
      setLassoPath([]);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectionMode !== 'click') return;
    const hit = getVoxelAtPosition(e.clientX, e.clientY);
    if (hit && onVoxelSelect) {
      onVoxelSelect(hit.voxel, hit.index);
    } else if (onVoxelSelect) {
      onVoxelSelect(null, -1);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    if (isDrawingLasso) {
      setIsDrawingLasso(false);
      setLassoPath([]);
    }
  };

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
          title="Draw lasso to select multiple voxels"
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
        <canvas
          ref={canvasRef}
          className="layer-2d-grid-canvas"
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          style={{
            display: 'block',
            borderRadius: '8px',
            cursor: selectionMode === 'lasso' ? 'crosshair' : 'pointer',
          }}
        />
        {hoveredIndex !== null && voxelPositionsRef.current[hoveredIndex] && (
          <div className="layer-2d-grid-tooltip">
            Voxel #{hoveredIndex} - (
            {voxelPositionsRef.current[hoveredIndex].voxel.x.toFixed(2)},
            {voxelPositionsRef.current[hoveredIndex].voxel.y.toFixed(2)},
            {voxelPositionsRef.current[hoveredIndex].voxel.z.toFixed(2)})
          </div>
        )}
      </div>
    </div>
  );
};
