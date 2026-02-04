import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import {
  createScene,
  setupCameraForGeometry,
  createModelMaterial,
  renderVoxelCubes,
  disposeScene,
  type SceneSetup,
} from '../utils/threeUtils';
import { API_BASE_URL } from '../utils/constants';
import { StatusMessage } from './StatusMessage';
import { LayerEditor } from './LayerEditor';

//HEAVILY INFLUENCED BY STL LOADER EXAMPLE https://sbcode.net/threejs/loaders-stl/

interface ModelViewerProps {
  selectedModel: string | null;
  voxelCoordinates: number[][];
  onStatusChange: (status: 'loading' | 'ready' | 'error') => void;
  selectedLayerZ?: number | null;
  layerAxis?: 'z' | 'x' | 'y';
  onLayerSelect?: (layerZ: number | null) => void;
  onVoxelSelect?: (voxel: { coord: number[]; index: number } | null) => void;
  onVoxelsSelect?: (voxels: Set<number>) => void;
  selectedVoxelIndex?: number | null;
  selectedVoxelIndices?: Set<number>;
  selectedVoxelIndicesArray?: number[];
  isLayerEditingMode?: boolean;
  projectName?: string;
  voxelSize?: number;
}

export const ModelViewer = ({
  selectedModel,
  voxelCoordinates,
  onStatusChange,
  selectedLayerZ = null,
  layerAxis = 'z',
  onLayerSelect,
  onVoxelSelect,
  onVoxelsSelect,
  selectedVoxelIndex = null,
  selectedVoxelIndices = new Set(),
  selectedVoxelIndicesArray = [],
  isLayerEditingMode = false,
  projectName = '',
  voxelSize,
}: ModelViewerProps) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sceneRef = useRef<SceneSetup | null>(null);
  const modelRef = useRef<THREE.Mesh | null>(null);
  const cubesRef = useRef<THREE.Mesh[]>([]);
  const cubeToCoordMapRef = useRef<
    Map<THREE.Mesh, { coord: number[]; index: number }>
  >(new Map());
  const selectedCubeRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const layerAxisRef = useRef<'z' | 'x' | 'y'>(layerAxis);
  layerAxisRef.current = layerAxis;
  const isLayerEditingModeRef = useRef<boolean>(isLayerEditingMode);
  isLayerEditingModeRef.current = isLayerEditingMode;
  const [viewerStatus, setViewerStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [viewerMessage, setViewerMessage] = useState<string | null>(null);
  const [selectedVoxel, setSelectedVoxel] = useState<{
    coord: number[];
    index: number;
  } | null>(null);
  const [isLayerEditorOpen, setIsLayerEditorOpen] = useState(false);

  useEffect(() => {
    if (!selectedModel) {
      return;
    }

    setViewerStatus('loading');
    setViewerMessage(null);
    setSelectedVoxel(null); // Clear selection when model changes
    selectedCubeRef.current = null;
    onStatusChange('loading');
    const mountElement = mountRef.current;
    if (!mountElement) {
      return;
    }

    let isMounted = true;

    const { clientWidth: width, clientHeight: height } = mountElement;
    const sceneSetup = createScene(width, height);
    sceneRef.current = sceneSetup;
    mountElement.appendChild(sceneSetup.renderer.domElement);

    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    const loader = new STLLoader();

    loader.load(
      `${API_BASE_URL}/api/stl/${encodeURIComponent(selectedModel)}`,
      (geometry: THREE.BufferGeometry) => {
        if (!isMounted) return;

        geometry.computeBoundingBox();
        const originalBbox = geometry.boundingBox;
        let originalCenter: THREE.Vector3 | null = null;
        if (originalBbox) {
          originalCenter = new THREE.Vector3();
          originalBbox.getCenter(originalCenter);
        }

        geometry.center();
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        geometry.computeBoundingBox();

        const boundingBox = geometry.boundingBox;
        if (boundingBox) {
          const size = new THREE.Vector3();
          boundingBox.getSize(size);
          const modelSize = Math.max(size.x, size.y, size.z);

          setupCameraForGeometry(
            sceneSetup.camera,
            sceneSetup.controls,
            geometry,
            sceneSetup.grid,
          );

          const material = createModelMaterial();
          const model = new THREE.Mesh(geometry, material);
          model.castShadow = true;
          model.receiveShadow = true;
          sceneSetup.scene.add(model);
          modelRef.current = model;

          if (voxelCoordinates.length > 0) {
            const { cubes, cubeToCoordMap } = renderVoxelCubes(
              sceneSetup.scene,
              voxelCoordinates,
              modelSize,
              originalCenter,
              cubesRef.current,
              isLayerEditingMode ? selectedLayerZ : null,
              layerAxis,
              isLayerEditingMode,
            );
            cubesRef.current = cubes;
            cubeToCoordMapRef.current = cubeToCoordMap;
            // Reset selection when voxels change
            selectedCubeRef.current = null;
            setSelectedVoxel(null);
          } else {
            // No voxels - clear selection
            selectedCubeRef.current = null;
            setSelectedVoxel(null);
          }

          setViewerStatus('ready');
          onStatusChange('ready');
        } else {
          const radius = geometry.boundingSphere?.radius ?? 1;
          setupCameraForGeometry(
            sceneSetup.camera,
            sceneSetup.controls,
            geometry,
            sceneSetup.grid,
          );

          const material = createModelMaterial();
          const model = new THREE.Mesh(geometry, material);
          model.castShadow = true;
          model.receiveShadow = true;
          sceneSetup.scene.add(model);
          modelRef.current = model;

          if (voxelCoordinates.length > 0) {
            const { cubes, cubeToCoordMap } = renderVoxelCubes(
              sceneSetup.scene,
              voxelCoordinates,
              radius * 2,
              undefined,
              cubesRef.current,
              isLayerEditingMode ? selectedLayerZ : null,
              layerAxis,
              isLayerEditingMode,
            );
            cubesRef.current = cubes;
            cubeToCoordMapRef.current = cubeToCoordMap;
            // Reset selection when voxels change
            selectedCubeRef.current = null;
            setSelectedVoxel(null);
          } else {
            // No voxels - clear selection
            selectedCubeRef.current = null;
            setSelectedVoxel(null);
          }

          setViewerStatus('ready');
          onStatusChange('ready');
        }
      },
      undefined,
      (error: unknown) => {
        console.error(`Failed to load STL model "${selectedModel}"`, error);
        if (!isMounted) return;
        const errorMsg = `Failed to load the STL model "${selectedModel}" from the server.`;
        setViewerStatus('error');
        setViewerMessage(errorMsg);
        onStatusChange('error');
      },
    );

    const handleResize = () => {
      if (!mountRef.current || !sceneRef.current) return;
      const { clientWidth, clientHeight } = mountRef.current;
      sceneRef.current.camera.aspect = clientWidth / clientHeight;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(clientWidth, clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Handle click events on voxels
    const handleClick = (event: MouseEvent) => {
      if (
        !sceneRef.current ||
        !raycasterRef.current ||
        cubesRef.current.length === 0
      )
        return;

      const rect = sceneSetup.renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(
        mouseRef.current,
        sceneRef.current.camera,
      );
      const intersects = raycasterRef.current.intersectObjects(
        cubesRef.current,
        false,
      );

      if (intersects.length > 0) {
        const clickedCube = intersects[0].object as THREE.Mesh;

        // Get the voxel coordinate
        const voxelInfo = cubeToCoordMapRef.current.get(clickedCube);
        if (voxelInfo) {
          const coord = voxelInfo.coord;

          // Check if modifier key is pressed (Ctrl/Cmd) for multiple voxel selection
          const isModifierPressed = event.ctrlKey || event.metaKey;

          if (isModifierPressed) {
            // Multi-voxel selection mode
            // Create a new Set from the current selection to avoid mutation issues
            // Use Array.from to ensure we get a fresh copy
            const currentSelected = new Set(Array.from(selectedVoxelIndices));

            if (currentSelected.has(voxelInfo.index)) {
              // Deselect if already selected
              currentSelected.delete(voxelInfo.index);
            } else {
              // Add to selection
              currentSelected.add(voxelInfo.index);
            }

            // Update the parent state with the new Set
            // Create a completely new Set to ensure React detects the change
            if (onVoxelsSelect) {
              onVoxelsSelect(new Set(Array.from(currentSelected)));
            }

            // Always update single voxel selection to the last clicked voxel
            // This helps with display and ensures we track the most recent selection
            if (onVoxelSelect) {
              if (currentSelected.size > 0) {
                // Set to the currently clicked voxel (or the last one if deselecting)
                if (currentSelected.has(voxelInfo.index)) {
                  onVoxelSelect(voxelInfo);
                  setSelectedVoxel(voxelInfo);
                } else if (currentSelected.size > 0) {
                  // If we deselected, pick the last remaining one
                  const lastIndex = Array.from(currentSelected).pop();
                  if (lastIndex !== undefined) {
                    const lastVoxel = Array.from(
                      cubeToCoordMapRef.current.values(),
                    ).find((v) => v.index === lastIndex);
                    if (lastVoxel) {
                      onVoxelSelect(lastVoxel);
                      setSelectedVoxel(lastVoxel);
                    }
                  }
                }
              } else {
                // No selections left
                onVoxelSelect(null);
                setSelectedVoxel(null);
              }
            }
          } else {
            // Single click - select layer only if layer editing mode is enabled
            if (isLayerEditingModeRef.current && onLayerSelect) {
              const col =
                layerAxisRef.current === 'x'
                  ? 0
                  : layerAxisRef.current === 'y'
                    ? 1
                    : 2;
              const layerValue = Math.round(coord[col] * 1e12) / 1e12;
              console.log(`[ModelViewer] Click on voxel - coord: ${coord}, col: ${col}, layerValue: ${layerValue}, selectedLayerZ: ${selectedLayerZ}`);
              if (
                selectedLayerZ !== null &&
                Math.abs(selectedLayerZ - layerValue) < 1e-9
              ) {
                console.log(`[ModelViewer] Deselecting layer (same layer clicked)`);
                onLayerSelect(null);
              } else {
                console.log(`[ModelViewer] Selecting layer: ${layerValue}`);
                onLayerSelect(layerValue);
              }
            }

            // Clear multi-selection on regular click (unless Ctrl is held)
            if (onVoxelsSelect && !event.ctrlKey && !event.metaKey) {
              onVoxelsSelect(new Set());
            }

            // Update single voxel selection (only if not in multi-select mode)
            if (onVoxelSelect && !event.ctrlKey && !event.metaKey) {
              onVoxelSelect(voxelInfo);
              setSelectedVoxel(voxelInfo);
            }
          }
        }

        selectedCubeRef.current = clickedCube;
      } else {
        // Clicked on empty space - deselect layer and voxels
        if (onLayerSelect) {
          onLayerSelect(null);
        }
        if (onVoxelSelect) {
          onVoxelSelect(null);
        }
        if (onVoxelsSelect) {
          onVoxelsSelect(new Set());
        }
        if (selectedCubeRef.current) {
          selectedCubeRef.current = null;
          setSelectedVoxel(null);
        }
      }
    };

    // Handle double-click for individual voxel selection (legacy support)
    let clickTimeout: number | null = null;
    const handleDoubleClick = (event: MouseEvent) => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
      }

      if (
        !sceneRef.current ||
        !raycasterRef.current ||
        cubesRef.current.length === 0
      )
        return;

      const rect = sceneSetup.renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(
        mouseRef.current,
        sceneRef.current.camera,
      );
      const intersects = raycasterRef.current.intersectObjects(
        cubesRef.current,
        false,
      );

      if (intersects.length > 0 && onVoxelSelect) {
        const clickedCube = intersects[0].object as THREE.Mesh;
        const voxelInfo = cubeToCoordMapRef.current.get(clickedCube);

        if (voxelInfo) {
          if (
            selectedVoxelIndex !== null &&
            selectedVoxelIndex === voxelInfo.index
          ) {
            // Toggle: deselect if double-clicking the same voxel
            onVoxelSelect(null);
            setSelectedVoxel(null);
            if (onVoxelsSelect) {
              onVoxelsSelect(new Set());
            }
          } else {
            onVoxelSelect(voxelInfo);
            setSelectedVoxel(voxelInfo);
            if (onVoxelsSelect) {
              onVoxelsSelect(new Set([voxelInfo.index]));
            }
          }
          selectedCubeRef.current = clickedCube;
        }
      }
    };

    sceneSetup.renderer.domElement.addEventListener('click', handleClick);
    sceneSetup.renderer.domElement.addEventListener(
      'dblclick',
      handleDoubleClick,
    );

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      if (modelRef.current) {
        modelRef.current.rotation.y += 0.003;
      }
      if (sceneRef.current) {
        sceneRef.current.controls.update();
        sceneRef.current.renderer.render(
          sceneRef.current.scene,
          sceneRef.current.camera,
        );
      }
    };

    animate();

    return () => {
      isMounted = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);

      if (sceneRef.current && sceneRef.current.renderer) {
        sceneRef.current.renderer.domElement.removeEventListener(
          'click',
          handleClick,
        );
        sceneRef.current.renderer.domElement.removeEventListener(
          'dblclick',
          handleDoubleClick,
        );
        disposeScene(
          sceneRef.current.scene,
          sceneRef.current.renderer,
          sceneRef.current.controls,
          cubesRef.current,
        );
      }

      if (
        sceneRef.current &&
        mountElement.contains(sceneRef.current.renderer.domElement)
      ) {
        mountElement.removeChild(sceneRef.current.renderer.domElement);
      }

      sceneRef.current = null;
      modelRef.current = null;
      cubesRef.current = [];
      cubeToCoordMapRef.current.clear();
      selectedCubeRef.current = null;
      raycasterRef.current = null;
      setSelectedVoxel(null);
    };
  }, [selectedModel, voxelCoordinates, onStatusChange]);

  // Separate effect to update voxel colors when layer or voxel selection changes
  useEffect(() => {
    if (
      !sceneRef.current ||
      cubesRef.current.length === 0 ||
      voxelCoordinates.length === 0
    ) {
      return;
    }

    const col = layerAxis === 'x' ? 0 : layerAxis === 'y' ? 1 : 2;
    const getLayerValue = (coord: number[]) =>
      Math.round(coord[col] * 1e12) / 1e12;

    const isInSelectedLayer = (coord: number[]): boolean => {
      if (
        !isLayerEditingMode ||
        selectedLayerZ === null ||
        selectedLayerZ === undefined
      )
        return false;
      return Math.abs(getLayerValue(coord) - selectedLayerZ) < 1e-9;
    };

    const layerZSet = new Set<number>();
    cubesRef.current.forEach((cube) => {
      layerZSet.add(getLayerValue(cube.userData.coord as number[]));
    });

    const sortedLayerZs = Array.from(layerZSet).sort((a, b) => a - b);

    // Distinct color palette for layers - cycles through these colors
    const layerColors = [
      0x3b82f6, // Blue
      0x10b981, // Green
      0xf59e0b, // Amber
      0xef4444, // Red
      0x8b5cf6, // Purple
      0xec4899, // Pink
      0x06b6d4, // Cyan
      0x84cc16, // Lime
      0xf97316, // Orange
      0x6366f1, // Indigo
    ];

    // Helper function to get color for a layer based on its index
    const getLayerColor = (layerZ: number): number => {
      const layerIndex = sortedLayerZs.indexOf(layerZ);
      if (layerIndex === -1) return 0xff0000; // Default red

      // Cycle through the color palette
      return layerColors[layerIndex % layerColors.length];
    };

    // Default neutral color when layer editing is off
    const defaultVoxelColor = 0x60a5fa; // Light blue

    // Update colors of existing cubes
    cubesRef.current.forEach((cube) => {
      const material = cube.material as THREE.MeshStandardMaterial;
      const coord = cube.userData.coord as number[];
      const layerZ = getLayerValue(coord);
      const isSelected = isInSelectedLayer(coord);

      // Get base color - use layer color only if layer editing mode is enabled
      const baseColor = isLayerEditingMode
        ? getLayerColor(layerZ)
        : defaultVoxelColor;

      // Check if this is a selected voxel (single or multiple)
      // Use both the Set and the array to ensure we catch all selections
      const isSelectedVoxel =
        (selectedVoxelIndex !== null &&
          cube.userData.index === selectedVoxelIndex) ||
        selectedVoxelIndices.has(cube.userData.index) ||
        (selectedVoxelIndicesArray &&
          selectedVoxelIndicesArray.includes(cube.userData.index));

      // Update material properties
      if (isSelectedVoxel) {
        // Highlight selected voxel(s) with yellow glow - always highlight selected voxels
        material.color.setHex(0xffff00); // Yellow for selected voxel
        material.opacity = 1.0;
        material.transparent = false;
        material.emissive.setHex(0xffff00);
        material.emissiveIntensity = 0.6;
      } else {
        // Use base color (layer color if editing mode, neutral if not)
        material.color.setHex(baseColor);

        if (isLayerEditingMode) {
          // Layer editing mode: highlight selected layers
          material.opacity = isSelected ? 1.0 : 0.6;
          material.transparent = !isSelected;

          if (isSelected) {
            // Make selected layer glow
            material.emissive.setHex(baseColor);
            material.emissiveIntensity = 0.4;
          } else {
            material.emissive.setHex(0x000000);
            material.emissiveIntensity = 0;
          }
        } else {
          // Normal mode: all voxels same opacity, no glow
          material.opacity = 1;
          material.transparent = true;
          material.emissive.setHex(0x000000);
          material.emissiveIntensity = 0;
        }
      }
    });
  }, [
    selectedLayerZ,
    selectedVoxelIndex,
    layerAxis,
    voxelCoordinates,
    isLayerEditingMode,
    selectedVoxelIndicesArray.join(','),
  ]);

  return (
    <div className="viewer" ref={mountRef}>
      <StatusMessage
        status={viewerStatus}
        message={viewerMessage}
        selectedModel={selectedModel}
      />
      <div className="viewer-instructions">
        <p className="instruction-text">
          {isLayerEditingMode ? (
            <>
              <strong>Click</strong> to select layer •{' '}
              <strong>Ctrl/Cmd+Click</strong> to select multiple voxels
            </>
          ) : (
            <>
              <strong>Ctrl/Cmd+Click</strong> to select multiple voxels
            </>
          )}
        </p>
      </div>
      {(selectedVoxel || selectedVoxelIndices.size > 0) && (
        <div className="voxel-info">
          <h4>
            {selectedVoxelIndices.size > 1
              ? `Selected Voxels (${selectedVoxelIndices.size})`
              : 'Selected Voxel'}
          </h4>
          {selectedVoxelIndices.size > 1 ? (
            <p>{selectedVoxelIndices.size} voxels selected</p>
          ) : selectedVoxel ? (
            <>
              <p>Index: {selectedVoxel.index}</p>
              <p>
                Position: ({selectedVoxel.coord[0].toFixed(3)},{' '}
                {selectedVoxel.coord[1].toFixed(3)},{' '}
                {selectedVoxel.coord[2].toFixed(3)})
              </p>
            </>
          ) : null}
        </div>
      )}
      {projectName.trim() && (
        <button
          className="layer-settings-toggle"
          onClick={() => setIsLayerEditorOpen(!isLayerEditorOpen)}
          title="Toggle Layer Editor"
        >
          {isLayerEditorOpen ? '✕' : '⚙️'}
        </button>
      )}
      <LayerEditor
        projectName={projectName}
        voxelSize={voxelSize}
        layerAxis={layerAxis}
        onLayerSelect={onLayerSelect}
        selectedLayerZ={selectedLayerZ}
        disabled={!projectName.trim()}
        isOpen={isLayerEditorOpen}
        onClose={() => setIsLayerEditorOpen(false)}
      />
    </div>
  );
};
