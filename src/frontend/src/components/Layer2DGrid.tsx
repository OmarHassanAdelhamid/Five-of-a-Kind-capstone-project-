import { useEffect, useRef, useState, useCallback } from 'react';
import type { LayerResponse, LayerVoxel } from '../utils/api';

type CellHit =
  | {
      type: 'voxel';
      index: number;
      voxel: LayerVoxel;
      x: number;
      y: number;
      w: number;
      h: number;
    }
  | {
      type: 'empty';
      gridX: number;
      gridY: number;
      x: number;
      y: number;
      w: number;
      h: number;
    };

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
  onLayerUp?: () => void;
  onLayerDown?: () => void;
  canGoUp?: boolean;
  canGoDown?: boolean;
}

function isPointInPolygon(
  px: number,
  py: number,
  polygon: { x: number; y: number }[],
): boolean {
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
  editVoxelsMode = false,
  onVoxelAdd,
  onVoxelRemove,
  onLayerUp,
  onLayerDown,
  canGoUp = false,
  canGoDown = false,
}: Layer2DGridProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const zoomContainerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredEmpty, setHoveredEmpty] = useState<{
    gridX: number;
    gridY: number;
  } | null>(null);
  const [selectionMode, setSelectionMode] = useState<'click' | 'lasso'>(
    'click',
  );
  const [lassoPath, setLassoPath] = useState<{ x: number; y: number }[]>([]);
  const [isDrawingLasso, setIsDrawingLasso] = useState(false);
  const [zoom, setZoom] = useState(1);
  const lassoPathRef = useRef<{ x: number; y: number }[]>([]);

  const voxelPositionsRef = useRef<
    Array<{
      x: number;
      y: number;
      w: number;
      h: number;
      voxel: LayerVoxel;
      index: number;
    }>
  >([]);
  const emptyCellPositionsRef = useRef<
    Array<{
      x: number;
      y: number;
      w: number;
      h: number;
      gridX: number;
      gridY: number;
    }>
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
    if (!layerData?.bounds) return;
    const voxels = layerData.voxels ?? [];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { bounds } = layerData;
    const padding = 30;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;

    // When zoomed out in edit mode, expand the grid so more cells are addable
    const centerX = (bounds.grid_x_min + bounds.grid_x_max) / 2;
    const centerY = (bounds.grid_y_min + bounds.grid_y_max) / 2;
    const halfSpanX = (bounds.grid_x_max - bounds.grid_x_min) / 2 + 0.5;
    const halfSpanY = (bounds.grid_y_max - bounds.grid_y_min) / 2 + 0.5;
    const expansionFactor = editVoxelsMode
      ? Math.min(4, Math.max(1, 1 / zoom))
      : 1;
    const expandedMinX = Math.floor(centerX - halfSpanX * expansionFactor);
    const expandedMaxX = Math.ceil(centerX + halfSpanX * expansionFactor);
    const expandedMinY = Math.floor(centerY - halfSpanY * expansionFactor);
    const expandedMaxY = Math.ceil(centerY + halfSpanY * expansionFactor);

    const gridCountX = Math.max(1, expandedMaxX - expandedMinX + 1);
    const gridCountY = Math.max(1, expandedMaxY - expandedMinY + 1);
    const gapRatio = 0.85;
    const cellW = Math.max(4, (drawWidth / gridCountX) * gapRatio);
    const cellH = Math.max(4, (drawHeight / gridCountY) * gapRatio);
    const cellSize = Math.min(cellW, cellH, 25);

    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    voxelPositionsRef.current = [];
    emptyCellPositionsRef.current = [];

    const actualDrawWidth = gridCountX * (cellSize / gapRatio);
    const actualDrawHeight = gridCountY * (cellSize / gapRatio);
    const offsetX = padding + (drawWidth - actualDrawWidth) / 2;
    const offsetY = padding + (drawHeight - actualDrawHeight) / 2;

    const occupied = new Set<string>();
    for (const v of voxels) {
      const gx = v.grid_x ?? 0;
      const gy = v.grid_y ?? 0;
      occupied.add(`${gx},${gy}`);
    }

    const cellStep = cellSize / gapRatio;
    const toPixelX = (gx: number) =>
      offsetX + (gx - expandedMinX + 0.5) * cellStep - cellSize / 2;
    const toPixelY = (gy: number) =>
      height - offsetY - (gy - expandedMinY + 0.5) * cellStep - cellSize / 2;

    if (editVoxelsMode) {
      for (let gy = expandedMinY; gy <= expandedMaxY; gy++) {
        for (let gx = expandedMinX; gx <= expandedMaxX; gx++) {
          const key = `${gx},${gy}`;
          const pixelX = toPixelX(gx);
          const pixelY = toPixelY(gy);
          if (!occupied.has(key)) {
            emptyCellPositionsRef.current.push({
              x: pixelX,
              y: pixelY,
              w: cellSize,
              h: cellSize,
              gridX: gx,
              gridY: gy,
            });
            const isHovered =
              hoveredEmpty?.gridX === gx && hoveredEmpty?.gridY === gy;
            ctx.fillStyle = isHovered
              ? 'rgba(56, 189, 248, 0.25)'
              : 'rgba(100, 116, 139, 0.2)';
            ctx.fillRect(pixelX, pixelY, cellSize, cellSize);
            ctx.strokeStyle = isHovered
              ? 'rgba(56, 189, 248, 0.8)'
              : 'rgba(148, 163, 184, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(pixelX, pixelY, cellSize, cellSize);
          }
        }
      }
    }

    for (let i = 0; i < voxels.length; i++) {
      const v = voxels[i];
      const gridX = (v.grid_x ?? 0) - expandedMinX;
      const gridY = (v.grid_y ?? 0) - expandedMinY;
      const pixelX = offsetX + (gridX + 0.5) * cellStep - cellSize / 2;
      const pixelY = height - offsetY - (gridY + 0.5) * cellStep - cellSize / 2;

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
      const isSelected =
        selectedVoxelIndices.size > 0 && selectedVoxelIndices.has(i);
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

  const getVoxelAtPosition = (clientX: number, clientY: number) => {
    const coords = getCanvasCoords(clientX, clientY);
    if (!coords) return null;
    const { x, y } = coords;
    for (const pos of voxelPositionsRef.current) {
      if (
        x >= pos.x &&
        x <= pos.x + pos.w &&
        y >= pos.y &&
        y <= pos.y + pos.h
      ) {
        return pos;
      }
      const centerX = pos.x + pos.w / 2;
      const centerY = pos.y + pos.h / 2;
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      if (distance < 20) return pos;
    }
    return null;
  };

  const getCellAtPosition = (
    clientX: number,
    clientY: number,
  ): CellHit | null => {
    const coords = getCanvasCoords(clientX, clientY);
    if (!coords) return null;
    const { x, y } = coords;
    for (const pos of voxelPositionsRef.current) {
      if (
        x >= pos.x &&
        x <= pos.x + pos.w &&
        y >= pos.y &&
        y <= pos.y + pos.h
      ) {
        return {
          type: 'voxel',
          index: pos.index,
          voxel: pos.voxel,
          x: pos.x,
          y: pos.y,
          w: pos.w,
          h: pos.h,
        };
      }
    }
    if (editVoxelsMode) {
      for (const pos of emptyCellPositionsRef.current) {
        if (
          x >= pos.x &&
          x <= pos.x + pos.w &&
          y >= pos.y &&
          y <= pos.y + pos.h
        ) {
          return {
            type: 'empty',
            gridX: pos.gridX,
            gridY: pos.gridY,
            x: pos.x,
            y: pos.y,
            w: pos.w,
            h: pos.h,
          };
        }
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;
    if (selectionMode === 'lasso' && !editVoxelsMode) {
      setIsDrawingLasso(true);
      lassoPathRef.current = [coords];
      setLassoPath([coords]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;
    if (isDrawingLasso && selectionMode === 'lasso' && !editVoxelsMode) {
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
      const cell = getCellAtPosition(e.clientX, e.clientY);
      if (cell?.type === 'voxel') {
        setHoveredIndex(cell.index);
        setHoveredEmpty(null);
      } else if (cell?.type === 'empty') {
        setHoveredEmpty({ gridX: cell.gridX, gridY: cell.gridY });
        setHoveredIndex(null);
      } else {
        setHoveredIndex(null);
        setHoveredEmpty(null);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawingLasso && selectionMode === 'lasso' && !editVoxelsMode) {
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
    if (e.button !== 0) return;
    if (editVoxelsMode && onVoxelRemove) {
      const cell = getCellAtPosition(e.clientX, e.clientY);
      if (cell?.type === 'voxel') onVoxelRemove(cell.index);
      return;
    }
    if (selectionMode !== 'click') return;
    const hit = getVoxelAtPosition(e.clientX, e.clientY);
    if (hit && onVoxelSelect) {
      onVoxelSelect(hit.voxel, hit.index);
    } else if (onVoxelSelect) {
      onVoxelSelect(null, -1);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (editVoxelsMode && onVoxelAdd) {
      const cell = getCellAtPosition(e.clientX, e.clientY);
      if (cell?.type === 'empty') onVoxelAdd(cell.gridX, cell.gridY);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setHoveredEmpty(null);
    if (isDrawingLasso) {
      setIsDrawingLasso(false);
      setLassoPath([]);
    }
  };

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setZoom((z) => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      return Math.min(4, Math.max(0.25, z + delta));
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest?.('input, textarea, [contenteditable="true"]'))
        return;
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setZoom((z) => Math.min(4, z + 0.25));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoom((z) => Math.max(0.25, z - 0.25));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
        <div
          ref={zoomContainerRef}
          className="layer-2d-grid-zoom-wrapper"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: '50% 50%',
          }}
          onWheel={handleWheel}
        >
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
            onContextMenu={handleContextMenu}
            style={{
              display: 'block',
              borderRadius: '8px',
              cursor: editVoxelsMode
                ? 'crosshair'
                : selectionMode === 'lasso'
                  ? 'crosshair'
                  : 'pointer',
            }}
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
