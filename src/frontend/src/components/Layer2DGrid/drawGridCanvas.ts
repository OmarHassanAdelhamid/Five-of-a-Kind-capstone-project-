/**
 * Canvas drawing for the orthographic layer view: cell layout, selection highlights, and
 * geometry helpers (e.g. point-in-polygon) for voxel picking.
 *
 * @author Khalid Farag
 * @lastModified 2026/04/05
 *
 * External reference: https://github.com/netdur/canvas.layout.ts
 */
import type { LayerResponse, LayerVoxel } from '../../utils/api';

// The type for the voxel position
export interface VoxelPosition {
  x: number;
  y: number;
  w: number;
  h: number;
  voxel: LayerVoxel;
  index: number;
}

// The type for the empty cell position
export interface EmptyCellPosition {
  x: number;
  y: number;
  w: number;
  h: number;
  gridX: number;
  gridY: number;
}


// Ray-casting algorithm: counts how many polygon edges a horizontal ray from
// (px, py) crosses. An odd count means the point is inside the polygon
export function isPointInPolygon(
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

// Paramters for the drawGridCanvas function
interface DrawGridCanvasParams {
  canvas: HTMLCanvasElement;
  layerData: LayerResponse;
  width: number;
  height: number;
  zoom: number;
  materialColors: Record<number, string>;
  cellColor: string;
  selectedCellColor: string;
  backgroundColor: string;
  selectedVoxelIndices: Set<number>;
  hoveredIndex: number | null;
  hoveredEmpty: { gridX: number; gridY: number } | null;
  editVoxelsMode: boolean;
  lassoPath: { x: number; y: number }[];
  isDrawingLasso: boolean;
  voxelPositionsOut: VoxelPosition[];
  emptyCellPositionsOut: EmptyCellPosition[];
}

export function drawGridCanvas({
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
  voxelPositionsOut,
  emptyCellPositionsOut,
}: DrawGridCanvasParams): void {
  // If there is no layer data, return
  if (!layerData?.bounds) return;


  const voxels = layerData.voxels ?? [];
  const ctx = canvas.getContext('2d');
  // If there is no context, return
  if (!ctx) return;

  const { bounds } = layerData;
  // Padding is the amount of space around the grid
  const padding = 30;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  // Sets the center of the grid
  const centerX = (bounds.grid_x_min + bounds.grid_x_max) / 2;
  const centerY = (bounds.grid_y_min + bounds.grid_y_max) / 2;
  const halfSpanX = (bounds.grid_x_max - bounds.grid_x_min) / 2 + 0.5;
  const halfSpanY = (bounds.grid_y_max - bounds.grid_y_min) / 2 + 0.5;


  // In edit mode, expand the visible grid beyond occupied voxels so the user
  // can click empty neighbouring cells to add new voxels
  const expansionFactor = editVoxelsMode
    ? Math.min(4, Math.max(1, 1 / zoom))
    : 1;
  const expandedMinX = Math.floor(centerX - halfSpanX * expansionFactor);
  const expandedMaxX = Math.ceil(centerX + halfSpanX * expansionFactor);
  const expandedMinY = Math.floor(centerY - halfSpanY * expansionFactor);
  const expandedMaxY = Math.ceil(centerY + halfSpanY * expansionFactor);

  // Calculates the number of cells in the grid
  const gridCountX = Math.max(1, expandedMaxX - expandedMinX + 1);
  const gridCountY = Math.max(1, expandedMaxY - expandedMinY + 1);


  // gapRatio controls how much of each grid slot a cell occupies
  const gapRatio = 0.85;
  const cellW = Math.max(4, (drawWidth / gridCountX) * gapRatio);
  const cellH = Math.max(4, (drawHeight / gridCountY) * gapRatio);
  const cellSize = Math.min(cellW, cellH, 25);

  canvas.width = width;
  canvas.height = height;
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
  voxelPositionsOut.length = 0;
  emptyCellPositionsOut.length = 0;

  // Calculates the actual width and height of the grid
  const actualDrawWidth = gridCountX * (cellSize / gapRatio);
  const actualDrawHeight = gridCountY * (cellSize / gapRatio);
  const offsetX = padding + (drawWidth - actualDrawWidth) / 2;
  const offsetY = padding + (drawHeight - actualDrawHeight) / 2;

  // Creates a set of occupied cells
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
    offsetY + (gy - expandedMinY + 0.5) * cellStep - cellSize / 2;

  // Draw empty cells in edit mode
  if (editVoxelsMode) {
    for (let gy = expandedMinY; gy <= expandedMaxY; gy++) {
      for (let gx = expandedMinX; gx <= expandedMaxX; gx++) {
        const key = `${gx},${gy}`;
        if (!occupied.has(key)) {
          const pixelX = toPixelX(gx);
          const pixelY = toPixelY(gy);
          emptyCellPositionsOut.push({
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

  // Draw the voxels onto the canvas
  for (let i = 0; i < voxels.length; i++) {
    const v = voxels[i];
    const gridX = (v.grid_x ?? 0) - expandedMinX;
    const gridY = (v.grid_y ?? 0) - expandedMinY;
    const pixelX = offsetX + (gridX + 0.5) * cellStep - cellSize / 2;
    const pixelY = offsetY + (gridY + 0.5) * cellStep - cellSize / 2;

    voxelPositionsOut.push({
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

    // Draw magnetization checkmark
    const hasMagnetization =
      (v.polarAngle != null && v.polarAngle !== 0) ||
      (v.azimuthAngle != null && v.azimuthAngle !== 0);
    if (hasMagnetization && cellSize >= 8) {
      const cx = pixelX + cellSize / 2;
      const cy = pixelY + cellSize / 2;
      const r = Math.max(3, cellSize * 0.28);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, cellSize * 0.1);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.55, cy);
      ctx.lineTo(cx - r * 0.1, cy + r * 0.5);
      ctx.lineTo(cx + r * 0.55, cy - r * 0.45);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
    }
  }

  // While the lasso is still being drawn, preview which cells will be affected: empty cells inside the polygon are colored green (will be added) and occupied voxels are colored red (will be removed).
  if (isDrawingLasso && editVoxelsMode && lassoPath.length >= 3) {
    for (const pos of emptyCellPositionsOut) {
      const cx = pos.x + pos.w / 2;
      const cy = pos.y + pos.h / 2;
      if (isPointInPolygon(cx, cy, lassoPath)) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.5)';
        ctx.fillRect(pos.x, pos.y, pos.w, pos.h);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x - 1, pos.y - 1, pos.w + 2, pos.h + 2);
      }
    }
    for (const pos of voxelPositionsOut) {
      const cx = pos.x + pos.w / 2;
      const cy = pos.y + pos.h / 2;
      if (isPointInPolygon(cx, cy, lassoPath)) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
        ctx.fillRect(pos.x, pos.y, pos.w, pos.h);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x - 1, pos.y - 1, pos.w + 2, pos.h + 2);
      }
    }
  }

  // Draw the lasso path on the canvas
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
}
