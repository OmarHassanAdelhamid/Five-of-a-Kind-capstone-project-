import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import {
  createScene,
  setupCameraForGeometry,
  setupCameraForVoxels,
  createModelMaterial,
  renderVoxelInstanced,
  disposeScene,
  type SceneSetup,
  type VoxelData,
} from '../utils/threeUtils';
import { API_BASE_URL } from '../utils/constants';
import { StatusMessage } from './StatusMessage';
import { LayerEditor, type LayerEditorHandle } from './LayerEditor';
import { PartitionsPanel } from './PartitionsPanel';

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
  selectedPartition?: string | null;
  onPartitionSelect?: (partitionName: string) => void;
  voxelSize?: number;
  isLayerEditorOpen?: boolean;
  onLayerEditorOpenChange?: (open: boolean) => void;
}

export const ModelViewer = forwardRef<LayerEditorHandle, ModelViewerProps>(function ModelViewer({
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
  selectedPartition = null,
  onPartitionSelect,
  voxelSize,
  isLayerEditorOpen: isLayerEditorOpenProp,
  onLayerEditorOpenChange,
}, ref) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const layerEditorRef = useRef<LayerEditorHandle | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sceneRef = useRef<SceneSetup | null>(null);
  const modelRef = useRef<THREE.Mesh | null>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const instanceIdMapRef = useRef<Map<number, VoxelData>>(new Map());
  const selectedCubeRef = useRef<number | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const layerAxisRef = useRef<'z' | 'x' | 'y'>(layerAxis);
  layerAxisRef.current = layerAxis;
  const isLayerEditingModeRef = useRef<boolean>(isLayerEditingMode);
  isLayerEditingModeRef.current = isLayerEditingMode;
  const selectedVoxelIndicesRef = useRef<Set<number>>(selectedVoxelIndices);
  selectedVoxelIndicesRef.current = selectedVoxelIndices;
  const onLayerSelectRef = useRef(onLayerSelect);
  onLayerSelectRef.current = onLayerSelect;
  const onVoxelSelectRef = useRef(onVoxelSelect);
  onVoxelSelectRef.current = onVoxelSelect;
  const onVoxelsSelectRef = useRef(onVoxelsSelect);
  onVoxelsSelectRef.current = onVoxelsSelect;
  const selectedLayerZRef = useRef(selectedLayerZ);
  selectedLayerZRef.current = selectedLayerZ;
  const selectedVoxelIndexRef = useRef(selectedVoxelIndex);
  selectedVoxelIndexRef.current = selectedVoxelIndex;
  const [viewerStatus, setViewerStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [viewerMessage, setViewerMessage] = useState<string | null>(null);
  const [selectedVoxel, setSelectedVoxel] = useState<{
    coord: number[];
    index: number;
  } | null>(null);
  const [isLayerEditorOpenLocal, setIsLayerEditorOpenLocal] = useState(false);
  const onLayerEditorOpenChangeRef = useRef(onLayerEditorOpenChange);
  onLayerEditorOpenChangeRef.current = onLayerEditorOpenChange;

  useImperativeHandle(
    ref,
    () => ({
      getSelectionProperties: () =>
        layerEditorRef.current?.getSelectionProperties() ?? null,
      applyPaste: (props) =>
        layerEditorRef.current?.applyPaste(props) ?? Promise.resolve(),
      selectAllInLayer: () => layerEditorRef.current?.selectAllInLayer(),
    }),
    [],
  );

  const isLayerEditorOpen =
    isLayerEditorOpenProp !== undefined
      ? isLayerEditorOpenProp
      : isLayerEditorOpenLocal;
  const setIsLayerEditorOpen = useCallback((open: boolean) => {
    if (onLayerEditorOpenChangeRef.current) {
      onLayerEditorOpenChangeRef.current(open);
    } else {
      setIsLayerEditorOpenLocal(open);
    }
  }, []);
  const [isPartitionsPanelOpen, setIsPartitionsPanelOpen] = useState(false);

  const COLOR_DEFAULT = 0x60a5fa;
  const COLOR_LAYER_SELECTED = 0xf59e0b;
  const COLOR_VOXEL_SELECTED = 0xef4444;

  useEffect(() => {
    if (!selectedModel) {
      return;
    }

    setViewerStatus('loading');
    setViewerMessage(null);
    setSelectedVoxel(null);
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
          const { mesh, instanceIdMap } = renderVoxelInstanced(
            sceneSetup.scene,
            voxelCoordinates,
            originalCenter,
            instancedMeshRef.current,
          );
          instancedMeshRef.current = mesh;
          instanceIdMapRef.current = instanceIdMap;
          selectedCubeRef.current = null;
          setSelectedVoxel(null);
        }

        setViewerStatus('ready');
        onStatusChange('ready');
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
        !instancedMeshRef.current
      )
        return;

      const rect = sceneSetup.renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(
        mouseRef.current,
        sceneRef.current.camera,
      );

      const intersects = raycasterRef.current.intersectObject(
        instancedMeshRef.current,
        false,
      );

      if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;
        if (instanceId === undefined) return;

        const voxelInfo = instanceIdMapRef.current.get(instanceId);

        if (voxelInfo) {
          const coord = voxelInfo.coord;
          const isModifierPressed = event.ctrlKey || event.metaKey;

          if (isModifierPressed) {
            const currentSelected = new Set(
              Array.from(selectedVoxelIndicesRef.current),
            );

            if (currentSelected.has(voxelInfo.index)) {
              currentSelected.delete(voxelInfo.index);
            } else {
              currentSelected.add(voxelInfo.index);
            }

            if (onVoxelsSelectRef.current) {
              onVoxelsSelectRef.current(new Set(Array.from(currentSelected)));
            }

            // Always update single voxel selection to the last clicked voxel
            // This helps with display and ensures we track the most recent selection
            if (onVoxelSelectRef.current) {
              if (currentSelected.has(voxelInfo.index)) {
                onVoxelSelectRef.current(voxelInfo);
                setSelectedVoxel(voxelInfo);
              } else if (currentSelected.size > 0) {
                const lastIndex = Array.from(currentSelected).pop();
                let lastVoxel = null;
                for (const v of instanceIdMapRef.current.values()) {
                  if (v.index === lastIndex) {
                    lastVoxel = v;
                    break;
                  }
                }
                if (lastVoxel) {
                  onVoxelSelectRef.current(lastVoxel);
                  setSelectedVoxel(lastVoxel);
                }
              } else {
                onVoxelSelectRef.current(null);
                setSelectedVoxel(null);
              }
            }
          } else {
            // Single click - select layer (opens layer editor and enables layer mode in App)
            if (onLayerSelectRef.current) {
              const col =
                layerAxisRef.current === 'x'
                  ? 0
                  : layerAxisRef.current === 'y'
                    ? 1
                    : 2;
              const layerValue = Math.round(coord[col] * 1e12) / 1e12;

              if (
                selectedLayerZRef.current !== null &&
                Math.abs(selectedLayerZRef.current - layerValue) < 1e-9
              ) {
                onLayerSelectRef.current(null);
              } else {
                onLayerSelectRef.current(layerValue);
                onLayerEditorOpenChangeRef.current?.(true);
              }
            }

            if (onVoxelsSelectRef.current && !event.ctrlKey && !event.metaKey) {
              onVoxelsSelectRef.current(new Set());
            }

            if (onVoxelSelectRef.current && !event.ctrlKey && !event.metaKey) {
              onVoxelSelectRef.current(voxelInfo);
              setSelectedVoxel(voxelInfo);
            }
          }
          selectedCubeRef.current = instanceId;
        }
      } else {
        if (onLayerSelectRef.current) onLayerSelectRef.current(null);
        if (onVoxelSelectRef.current) onVoxelSelectRef.current(null);
        if (onVoxelsSelectRef.current) onVoxelsSelectRef.current(new Set());
        selectedCubeRef.current = null;
        setSelectedVoxel(null);
      }
    };

    const handleDoubleClick = (event: MouseEvent) => {
      if (
        !sceneRef.current ||
        !raycasterRef.current ||
        !instancedMeshRef.current
      )
        return;

      const rect = sceneSetup.renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(
        mouseRef.current,
        sceneRef.current.camera,
      );
      const intersects = raycasterRef.current.intersectObject(
        instancedMeshRef.current,
        false,
      );

      if (
        intersects.length > 0 &&
        intersects[0].instanceId !== undefined &&
        onVoxelSelectRef.current
      ) {
        const instanceId = intersects[0].instanceId;
        const voxelInfo = instanceIdMapRef.current.get(instanceId);
        if (voxelInfo) {
          if (selectedVoxelIndexRef.current === voxelInfo.index) {
            onVoxelSelectRef.current(null);
            setSelectedVoxel(null);
            if (onVoxelsSelectRef.current) onVoxelsSelectRef.current(new Set());
          } else {
            onVoxelSelectRef.current(voxelInfo);
            setSelectedVoxel(voxelInfo);
            if (onVoxelsSelectRef.current)
              onVoxelsSelectRef.current(new Set([voxelInfo.index]));
          }
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
          instancedMeshRef.current,
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
      instancedMeshRef.current = null;
      instanceIdMapRef.current.clear();
      selectedCubeRef.current = null;
      raycasterRef.current = null;
      setSelectedVoxel(null);
    };
  }, [selectedModel, voxelCoordinates, onStatusChange]);

  useEffect(() => {
    if (selectedModel || voxelCoordinates.length === 0) {
      return;
    }

    setViewerStatus('loading');
    setViewerMessage(null);
    setSelectedVoxel(null);
    onStatusChange('loading');
    const mountElement = mountRef.current;
    if (!mountElement) return;

    let isMounted = true;
    const { clientWidth: width, clientHeight: height } = mountElement;
    const sceneSetup = createScene(width, height);
    sceneRef.current = sceneSetup;
    mountElement.appendChild(sceneSetup.renderer.domElement);

    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    setupCameraForVoxels(
      sceneSetup.camera,
      sceneSetup.controls,
      voxelCoordinates,
      sceneSetup.grid,
    );

    const { mesh, instanceIdMap } = renderVoxelInstanced(
      sceneSetup.scene,
      voxelCoordinates,
      undefined,
      instancedMeshRef.current,
    );
    instancedMeshRef.current = mesh;
    instanceIdMapRef.current = instanceIdMap;

    if (isMounted) {
      setViewerStatus('ready');
      onStatusChange('ready');
    }

    const handleResize = () => {
      if (!mountRef.current || !sceneRef.current) return;
      const { clientWidth, clientHeight } = mountRef.current;
      sceneRef.current.camera.aspect = clientWidth / clientHeight;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(clientWidth, clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const handleClick = (event: MouseEvent) => {
      if (
        !sceneRef.current ||
        !raycasterRef.current ||
        !instancedMeshRef.current
      )
        return;

      const rect = sceneSetup.renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(
        mouseRef.current,
        sceneRef.current.camera,
      );

      const intersects = raycasterRef.current.intersectObject(
        instancedMeshRef.current,
        false,
      );

      if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;
        if (instanceId === undefined) return;

        const voxelInfo = instanceIdMapRef.current.get(instanceId);

        if (voxelInfo) {
          const coord = voxelInfo.coord;
          const isModifierPressed = event.ctrlKey || event.metaKey;

          if (isModifierPressed) {
            const currentSelected = new Set(
              Array.from(selectedVoxelIndicesRef.current),
            );

            if (currentSelected.has(voxelInfo.index)) {
              currentSelected.delete(voxelInfo.index);
            } else {
              currentSelected.add(voxelInfo.index);
            }

            if (onVoxelsSelectRef.current) {
              onVoxelsSelectRef.current(new Set(Array.from(currentSelected)));
            }

            if (onVoxelSelectRef.current) {
              if (currentSelected.has(voxelInfo.index)) {
                onVoxelSelectRef.current(voxelInfo);
                setSelectedVoxel(voxelInfo);
              } else if (currentSelected.size > 0) {
                const lastIndex = Array.from(currentSelected).pop();
                let lastVoxel = null;
                for (const v of instanceIdMapRef.current.values()) {
                  if (v.index === lastIndex) {
                    lastVoxel = v;
                    break;
                  }
                }
                if (lastVoxel) {
                  onVoxelSelectRef.current(lastVoxel);
                  setSelectedVoxel(lastVoxel);
                }
              } else {
                onVoxelSelectRef.current(null);
                setSelectedVoxel(null);
              }
            }
          } else {
            if (onLayerSelectRef.current) {
              const col =
                layerAxisRef.current === 'x'
                  ? 0
                  : layerAxisRef.current === 'y'
                    ? 1
                    : 2;
              const layerValue = Math.round(coord[col] * 1e12) / 1e12;

              if (
                selectedLayerZRef.current !== null &&
                Math.abs(selectedLayerZRef.current - layerValue) < 1e-9
              ) {
                onLayerSelectRef.current(null);
              } else {
                onLayerSelectRef.current(layerValue);
                onLayerEditorOpenChangeRef.current?.(true);
              }
            }

            if (onVoxelsSelectRef.current && !event.ctrlKey && !event.metaKey) {
              onVoxelsSelectRef.current(new Set());
            }

            if (onVoxelSelectRef.current && !event.ctrlKey && !event.metaKey) {
              onVoxelSelectRef.current(voxelInfo);
              setSelectedVoxel(voxelInfo);
            }
          }
          selectedCubeRef.current = instanceId;
        }
      } else {
        if (onLayerSelectRef.current) onLayerSelectRef.current(null);
        if (onVoxelSelectRef.current) onVoxelSelectRef.current(null);
        if (onVoxelsSelectRef.current) onVoxelsSelectRef.current(new Set());
        selectedCubeRef.current = null;
        setSelectedVoxel(null);
      }
    };

    const handleDoubleClick = (event: MouseEvent) => {
      if (
        !sceneRef.current ||
        !raycasterRef.current ||
        !instancedMeshRef.current
      )
        return;

      const rect = sceneSetup.renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(
        mouseRef.current,
        sceneRef.current.camera,
      );
      const intersects = raycasterRef.current.intersectObject(
        instancedMeshRef.current,
        false,
      );

      if (
        intersects.length > 0 &&
        intersects[0].instanceId !== undefined &&
        onVoxelSelectRef.current
      ) {
        const instanceId = intersects[0].instanceId;
        const voxelInfo = instanceIdMapRef.current.get(instanceId);
        if (voxelInfo) {
          if (selectedVoxelIndexRef.current === voxelInfo.index) {
            onVoxelSelectRef.current(null);
            setSelectedVoxel(null);
            if (onVoxelsSelectRef.current) onVoxelsSelectRef.current(new Set());
          } else {
            onVoxelSelectRef.current(voxelInfo);
            setSelectedVoxel(voxelInfo);
            if (onVoxelsSelectRef.current)
              onVoxelsSelectRef.current(new Set([voxelInfo.index]));
          }
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
      cancelAnimationFrame(animationFrameRef.current!);
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
          instancedMeshRef.current,
        );
      }
      if (mountElement && sceneRef.current)
        mountElement.removeChild(sceneRef.current.renderer.domElement);
      sceneRef.current = null;
      instancedMeshRef.current = null;
      instanceIdMapRef.current.clear();
      selectedCubeRef.current = null;
      raycasterRef.current = null;
      setSelectedVoxel(null);
    };
  }, [selectedModel, voxelCoordinates, onStatusChange]);

  useEffect(() => {
    if (!instancedMeshRef.current || instanceIdMapRef.current.size === 0)
      return;

    const mesh = instancedMeshRef.current;
    const col = layerAxis === 'x' ? 0 : layerAxis === 'y' ? 1 : 2;
    const getLayerValue = (coord: number[]) =>
      Math.round(coord[col] * 1e12) / 1e12;

    const dummyColor = new THREE.Color();

    for (let i = 0; i < mesh.count; i++) {
      const data = instanceIdMapRef.current.get(i);
      if (!data) continue;

      const layerValue = getLayerValue(data.coord);

      const isSelectedVoxel =
        (selectedVoxelIndex !== null && data.index === selectedVoxelIndex) ||
        selectedVoxelIndices.has(data.index) ||
        (selectedVoxelIndicesArray &&
          selectedVoxelIndicesArray.includes(data.index));

      // Check Layer
      const isSelectedLayer =
        isLayerEditingMode &&
        selectedLayerZ !== null &&
        selectedLayerZ !== undefined &&
        Math.abs(selectedLayerZ - layerValue) < 1e-9;

      if (isSelectedVoxel) {
        dummyColor.setHex(COLOR_VOXEL_SELECTED);
      } else if (isSelectedLayer) {
        dummyColor.setHex(COLOR_LAYER_SELECTED);
      } else {
        dummyColor.setHex(COLOR_DEFAULT);
      }

      mesh.setColorAt(i, dummyColor);
    }

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [
    selectedLayerZ,
    selectedVoxelIndex,
    layerAxis,
    isLayerEditingMode,
    selectedVoxelIndicesArray,
    selectedVoxelIndices,
    voxelCoordinates,
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
          {voxelCoordinates.length > 0 ? (
            <>
              <strong>Click</strong> to select layer (opens Layer Editor) •{' '}
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
      <button
        className={`partitions-tab ${isPartitionsPanelOpen ? 'open' : ''}`}
        onClick={() => setIsPartitionsPanelOpen(!isPartitionsPanelOpen)}
        title={isPartitionsPanelOpen ? 'Close Partitions' : 'Open Partitions'}
      >
        <span className="partitions-tab-text">Partitions</span>
      </button>
      <PartitionsPanel
        isOpen={isPartitionsPanelOpen}
        onClose={() => setIsPartitionsPanelOpen(false)}
        projectName={projectName || null}
        selectedPartition={selectedPartition}
        onPartitionSelect={onPartitionSelect || (() => {})}
      />
      <button
        className={`layer-editor-tab ${isLayerEditorOpen ? 'open' : ''}`}
        onClick={() => setIsLayerEditorOpen(!isLayerEditorOpen)}
        title={isLayerEditorOpen ? 'Close Layer Editor' : 'Open Layer Editor'}
      >
        <span className="layer-editor-tab-text">Layer Editor</span>
      </button>
      <LayerEditor
        ref={layerEditorRef}
        projectName={projectName}
        partitionName={selectedPartition}
        voxelSize={voxelSize}
        layerAxis={layerAxis}
        onLayerSelect={onLayerSelect}
        selectedLayerZ={selectedLayerZ}
        disabled={!projectName.trim() || !selectedPartition}
        isOpen={isLayerEditorOpen}
        onClose={() => setIsLayerEditorOpen(false)}
      />
    </div>
  );
});
