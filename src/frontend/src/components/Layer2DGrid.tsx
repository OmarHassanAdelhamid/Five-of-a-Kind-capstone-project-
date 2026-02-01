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
    const rangeX = bounds.grid_x_max - bounds.grid_x_min || 1;
    const rangeY = bounds.grid_y_max - bounds.grid_y_min || 1;

    // Add padding to prevent edge clipping
    const padding = 20;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;

    // Calculate cell size based on grid dimensions
    const gridCountX = Math.max(1, Math.ceil(rangeX));
    const gridCountY = Math.max(1, Math.ceil(rangeY));

    const gapFactor = 0.1;
    // Size cells to fit the grid, with minimum size
    const cellW = Math.max(
      5,
      Math.min((drawWidth / gridCountX) * gapFactor, 20),
    );
    const cellH = Math.max(
      5,
      Math.min((drawHeight / gridCountY) * gapFactor, 20),
    );

    canvas.width = width;
    canvas.height = height;

    // Clear and fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines (optional, for reference)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 1;

    // Store voxel positions for hit detection
    voxelPositionsRef.current = [];

    // Draw voxels
    for (let i = 0; i < voxels.length; i++) {
      const v = voxels[i];
      const pixelX =
        padding + ((v.grid_x - bounds.grid_x_min) / rangeX) * drawWidth;
      const pixelY =
        padding + ((v.grid_y - bounds.grid_y_min) / rangeY) * drawHeight;

      // Flip Y coordinate (canvas Y increases downward)
      const drawX = pixelX - cellW / 2;
      const drawY = height - pixelY - cellH / 2;

      // Store position for hit detection
      voxelPositionsRef.current.push({
        x: drawX,
        y: drawY,
        w: cellW,
        h: cellH,
        voxel: v,
        index: i,
      });

      // Determine color based on selection/hover state
      let fillColor = cellColor;
      if (selectedVoxelIndex === i) {
        fillColor = selectedCellColor;
      } else if (hoveredIndex === i) {
        fillColor = '#93c5fd'; // Lighter blue for hover
      }

      ctx.fillStyle = fillColor;
      ctx.fillRect(drawX, drawY, cellW, cellH);

      // Draw border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(drawX, drawY, cellW, cellH);

      // Highlight selected voxel
      if (selectedVoxelIndex === i) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX - 1, drawY - 1, cellW + 2, cellH + 2);
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
