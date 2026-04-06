/**
 * Pointer and keyboard handlers for selecting, multi-selecting, and editing cells on the 2D
 * layer grid.
 *
 * @author Khalid Farag
 * @lastModified 2026/04/03
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type MouseEvent,
} from 'react';
import type { LayerVoxel } from '../../../utils/api';
import {
  isPointInPolygon,
  type VoxelPosition,
  type EmptyCellPosition,
} from '../drawGridCanvas';

interface UseGridInteractionParams {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  voxelPositionsRef: RefObject<VoxelPosition[]>;
  emptyCellPositionsRef: RefObject<EmptyCellPosition[]>;
  editVoxelsMode: boolean;
  onVoxelSelect?: (voxel: LayerVoxel | null, index: number) => void;
  onVoxelsSelect?: (voxels: LayerVoxel[], indices: number[]) => void;
  onVoxelAdd?: (gridX: number, gridY: number) => void;
  onVoxelRemove?: (index: number) => void;
  onVoxelsAdd?: (cells: { gridX: number; gridY: number }[]) => void;
  onVoxelsRemove?: (indices: number[]) => void;
}

export function useGridInteraction({
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
}: UseGridInteractionParams) {
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

  
  // lassoPathRef mirrors lassoPath state but is readable inside mouse-event
  // callbacks without triggering stale-closure issues. The ref is written on
  // every move and read at mouseup; the state drives the canvas redraw.
  const lassoPathRef = useRef<{ x: number; y: number }[]>([]);


  // Get canvas coordinates from client coordinates
  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [canvasRef],
  );


  // Gets the voxel at the given client coordinates
  const getVoxelAtPosition = useCallback(
    (clientX: number, clientY: number) => {
      const coords = getCanvasCoords(clientX, clientY);
      if (!coords) return null;
      const { x, y } = coords;
      for (const pos of voxelPositionsRef.current ?? []) {
        if (
          x >= pos.x &&
          x <= pos.x + pos.w &&
          y >= pos.y &&
          y <= pos.y + pos.h
        ) {
          return pos;
        }

        // When cells are very small (zoomed out), the exact bounding-box hits become unreliable, so also accept a 20 px radius around each cell centre.
        const centerX = pos.x + pos.w / 2;
        const centerY = pos.y + pos.h / 2;
        if (Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2) < 20) return pos;
      }
      return null;
    },
    [getCanvasCoords, voxelPositionsRef],
  );

  // Gets the cell at the given client coordinates, used for hover and click events
  const getCellAtPosition = useCallback(
    (clientX: number, clientY: number) => {
      const coords = getCanvasCoords(clientX, clientY);
      if (!coords) return null;
      const { x, y } = coords;
      for (const pos of voxelPositionsRef.current ?? []) {
        if (
          x >= pos.x &&
          x <= pos.x + pos.w &&
          y >= pos.y &&
          y <= pos.y + pos.h
        ) {
          return { type: 'voxel' as const, ...pos };
        }
      }
      if (editVoxelsMode) {
        for (const pos of emptyCellPositionsRef.current ?? []) {
          if (
            x >= pos.x &&
            x <= pos.x + pos.w &&
            y >= pos.y &&
            y <= pos.y + pos.h
          ) {
            return { type: 'empty' as const, ...pos };
          }
        }
      }
      return null;
    },
    [getCanvasCoords, voxelPositionsRef, emptyCellPositionsRef, editVoxelsMode],
  );

  // Handles mouse down events, starts lasso drawing if in lasso mode 
  const handleMouseDown = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (!coords) return;
      if (selectionMode === 'lasso') {
        setIsDrawingLasso(true);
        lassoPathRef.current = [coords];
        setLassoPath([coords]);
      }
    },
    [getCanvasCoords, selectionMode],
  );

  // Handles mouse move events, updates lasso path and hover state
  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (!coords) return;
      if (isDrawingLasso && selectionMode === 'lasso') {
        const prev = lassoPathRef.current;
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          // Only append a new point when the cursor has moved at least 5 px
          // to avoid thousands of near-duplicate points.
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
    },
    [getCanvasCoords, isDrawingLasso, selectionMode, getCellAtPosition],
  );

  // Handles mouse up events, finalizes lasso selection or single voxel selection
  const handleMouseUp = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      if (isDrawingLasso && selectionMode === 'lasso') {
        setIsDrawingLasso(false);
        const path = lassoPathRef.current;
        if (path.length >= 3) {
          const polygon = [...path];
          if (editVoxelsMode) {
            const emptyCellsInLasso = (
              emptyCellPositionsRef.current ?? []
            ).filter((pos) =>
              isPointInPolygon(pos.x + pos.w / 2, pos.y + pos.h / 2, polygon),
            );
            const voxelIndicesInLasso = (voxelPositionsRef.current ?? [])
              .filter((pos) =>
                isPointInPolygon(pos.x + pos.w / 2, pos.y + pos.h / 2, polygon),
              )
              .map((pos) => pos.index);
            if (emptyCellsInLasso.length > 0 && onVoxelsAdd) {
              onVoxelsAdd(
                emptyCellsInLasso.map((c) => ({
                  gridX: c.gridX,
                  gridY: c.gridY,
                })),
              );
            }
            if (voxelIndicesInLasso.length > 0 && onVoxelsRemove) {
              onVoxelsRemove(voxelIndicesInLasso);
            }
          } else {
            const selected: { voxel: LayerVoxel; index: number }[] = [];
            for (const pos of voxelPositionsRef.current ?? []) {
              if (
                isPointInPolygon(pos.x + pos.w / 2, pos.y + pos.h / 2, polygon)
              ) {
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
          }
        } else if (path.length === 1 && onVoxelSelect && !editVoxelsMode) {
          const hit = getVoxelAtPosition(e.clientX, e.clientY);
          if (hit) onVoxelSelect(hit.voxel, hit.index);
        }
        setLassoPath([]);
      }
    },
    [
      isDrawingLasso,
      selectionMode,
      editVoxelsMode,
      emptyCellPositionsRef,
      voxelPositionsRef,
      onVoxelsAdd,
      onVoxelsRemove,
      onVoxelsSelect,
      onVoxelSelect,
      getVoxelAtPosition,
    ],
  );

  // Handles click events, adds or removes voxels in edit mode or selects a voxel
  const handleClick = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      if (editVoxelsMode) {
        if (selectionMode === 'lasso') return;
        const cell = getCellAtPosition(e.clientX, e.clientY);
        if (cell?.type === 'voxel' && onVoxelRemove) {
          onVoxelRemove(cell.index);
        } else if (cell?.type === 'empty' && onVoxelAdd) {
          onVoxelAdd(cell.gridX, cell.gridY);
        }
        return;
      }
      if (selectionMode !== 'click') return;
      const hit = getVoxelAtPosition(e.clientX, e.clientY);
      if (hit && onVoxelSelect) {
        onVoxelSelect(hit.voxel, hit.index);
      } else if (onVoxelSelect) {
        onVoxelSelect(null, -1);
      }
    },
    [
      editVoxelsMode,
      selectionMode,
      getCellAtPosition,
      onVoxelRemove,
      onVoxelAdd,
      getVoxelAtPosition,
      onVoxelSelect,
    ],
  );

  // Handles mouse leave events, clears hover state and stops lasso drawing
  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
    setHoveredEmpty(null);
    if (isDrawingLasso) {
      setIsDrawingLasso(false);
      setLassoPath([]);
    }
  }, [isDrawingLasso]);

  // This prevents the default context menu from appearing when right-clicking on the canvas
  const handleContextMenu = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  }, []);

  // Handles keyboard events, zooms in and out when +/- is pressed
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

  return {
    hoveredIndex,
    hoveredEmpty,
    selectionMode,
    setSelectionMode,
    lassoPath,
    isDrawingLasso,
    zoom,
    mouseHandlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onClick: handleClick,
      onContextMenu: handleContextMenu,
    },
  };
}
