import { useEffect, useRef, useState, useCallback } from 'react';
import type { LayerResponse, LayerVoxel } from '../utils/api';

interface Layer2DGridProps {
  layerData: LayerResponse | null;
  width?: number;
  height?: number;
  cellColor?: string;
  selectedCellColor?: string;
  backgroundColor?: string;
  onVoxelSelect?: (voxel: LayerVoxel | null, index: number) => void;
  selectedVoxelIndex?: number | null;
}

export const Layer2DGrid = ({
  layerData,
  width = 550,
  height = 500,
  cellColor = '#60a5fa',
  selectedCellColor = '#facc15',
  backgroundColor = '#1e293b',
  onVoxelSelect,
  selectedVoxelIndex = null,
}: Layer2DGridProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Store voxel positions for hit detection
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

  const draw = useCallback(() => {
    if (!layerData?.voxels?.length || !layerData.bounds) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { bounds, voxels } = layerData;

    // Add padding to prevent edge clipping
    const padding = 30;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;

    // Calculate grid dimensions (add 1 because indices are inclusive)
    const gridCountX = Math.max(1, bounds.grid_x_max - bounds.grid_x_min + 1);
    const gridCountY = Math.max(1, bounds.grid_y_max - bounds.grid_y_min + 1);

    // Calculate cell size to fit grid with small gaps
    const gapRatio = 0.85; // Cells take up 85% of available space
    const cellW = Math.max(4, (drawWidth / gridCountX) * gapRatio);
    const cellH = Math.max(4, (drawHeight / gridCountY) * gapRatio);

    // Use uniform cell size (take smaller to maintain square cells)
    const cellSize = Math.min(cellW, cellH, 25); // Max cell size of 25px

    canvas.width = width;
    canvas.height = height;

    // Clear and fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Store voxel positions for hit detection
    voxelPositionsRef.current = [];

    // Calculate actual drawing area based on cell size
    const actualDrawWidth = gridCountX * (cellSize / gapRatio);
    const actualDrawHeight = gridCountY * (cellSize / gapRatio);

    // Center the grid in the canvas
    const offsetX = padding + (drawWidth - actualDrawWidth) / 2;
    const offsetY = padding + (drawHeight - actualDrawHeight) / 2;

    // Draw voxels
    for (let i = 0; i < voxels.length; i++) {
      const v = voxels[i];
      const gridX = (v.grid_x ?? 0) - bounds.grid_x_min;
      const gridY = (v.grid_y ?? 0) - bounds.grid_y_min;

      // Calculate pixel position
      const pixelX = offsetX + (gridX + 0.5) * (cellSize / gapRatio) - cellSize / 2;
      // Flip Y coordinate (canvas Y increases downward)
      const pixelY =
        height - offsetY - (gridY + 0.5) * (cellSize / gapRatio) - cellSize / 2;

      // Store position for hit detection
      voxelPositionsRef.current.push({
        x: pixelX,
        y: pixelY,
        w: cellSize,
        h: cellSize,
        voxel: v,
        index: i,
      });

      // Determine color based on selection/hover state and material
      let fillColor = cellColor;
      if (selectedVoxelIndex === i) {
        fillColor = selectedCellColor;
      } else if (hoveredIndex === i) {
        fillColor = '#93c5fd'; // Lighter blue for hover
      }

      ctx.fillStyle = fillColor;
      ctx.fillRect(pixelX, pixelY, cellSize, cellSize);

      // Draw border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(pixelX, pixelY, cellSize, cellSize);

      // Highlight selected voxel
      if (selectedVoxelIndex === i) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.strokeRect(pixelX - 1, pixelY - 1, cellSize + 2, cellSize + 2);
      }
    }
  }, [
    layerData,
    width,
    height,
    cellColor,
    selectedCellColor,
    backgroundColor,
    selectedVoxelIndex,
    hoveredIndex,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getVoxelAtPosition = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    // Scale mouse coordinates to match canvas internal resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Find the closest voxel to cursor position
    let closestVoxel = null;
    let closestDistance = Infinity;

    for (const pos of voxelPositionsRef.current) {
      // Check if cursor is inside the voxel bounds
      if (
        x >= pos.x &&
        x <= pos.x + pos.w &&
        y >= pos.y &&
        y <= pos.y + pos.h
      ) {
        return pos;
      }

      // Calculate distance to voxel center for finding closest
      const centerX = pos.x + pos.w / 2;
      const centerY = pos.y + pos.h / 2;
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

      // Only consider voxels within a reasonable proximity (e.g., 20 pixels)
      if (distance < closestDistance && distance < 20) {
        closestDistance = distance;
        closestVoxel = pos;
      }
    }

    return closestVoxel;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = getVoxelAtPosition(e.clientX, e.clientY);
    if (hit && onVoxelSelect) {
      onVoxelSelect(hit.voxel, hit.index);
    } else if (onVoxelSelect) {
      onVoxelSelect(null, -1);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = getVoxelAtPosition(e.clientX, e.clientY);
    setHoveredIndex(hit ? hit.index : null);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
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
      <canvas
        ref={canvasRef}
        className="layer-2d-grid-canvas"
        width={width}
        height={height}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'block',
          borderRadius: '8px',
          cursor: 'pointer',
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
  );
};
