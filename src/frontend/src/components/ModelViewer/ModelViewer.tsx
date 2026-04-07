/**
 * Main 3D viewport for a project: loads the STL mesh from the API, renders voxel geometry,
 * and connects pointer input to layer selection, multi-voxel selection, and the layer editor.
 * Embeds status UI, partitions, and the layer editor alongside the canvas.
 *
 * @author Andrew Bovbel, Khalid Farag
 * @lastModified 2026/04/04
 *
 *
 * External reference for STL loading patterns: https://sbcode.net/threejs/loaders-stl/
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
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
} from '../../utils/threeUtils';
import { API_BASE_URL } from '../../utils/constants';
import { StatusMessage } from '../Messages/StatusMessage';
import { Footer } from '../Messages/Footer';
import { LayerEditor, type LayerEditorHandle } from '../LayerEditor';
import { PartitionsPanel } from '../PartitionPanel/PartitionsPanel';

/**
 * Contract with `App`: which asset and voxel set are shown, how selection is expressed,
 * and callbacks to keep global project / partition / layer state in sync with the canvas.
 */
interface ModelViewerProps {
  /** Server STL id for the mesh; `null` means voxel-only view. */
  selectedModel: string | null;
  /** World-space voxel centers for the active partition (drives instanced mesh). */
  voxelCoordinates: number[][];
  /** Lets `App` show loading overlays and gate actions while the viewer prepares or fails. */
  onStatusChange: (status: 'loading' | 'ready' | 'error') => void;
  /** Slice coordinate on `layerAxis` currently highlighted for editing. */
  selectedLayerZ?: number | null;
  /** Which world axis “layers” are taken along (affects picking and tinting). */
  layerAxis?: 'z' | 'x' | 'y';
  /** User picked a layer from the 3D view (or cleared it). */
  onLayerSelect?: (layerZ: number | null) => void;
  /** Primary voxel under the HUD / single-selection UX. */
  onVoxelSelect?: (voxel: { coord: number[]; index: number } | null) => void;
  /** Bulk selection for multi-voxel operations from the layer editor. */
  onVoxelsSelect?: (voxels: Set<number>) => void;
  selectedVoxelIndex?: number | null;
  selectedVoxelIndices?: Set<number>;
  /** Array mirror of multi-select for consumers that diff on array identity. */
  selectedVoxelIndicesArray?: number[];
  /** Whether the app is in a mode where layer slicing should be visually emphasized. */
  isLayerEditingMode?: boolean;
  projectName?: string;
  selectedPartition?: string | null;
  onPartitionSelect?: (partitionName: string) => void;
  /** World size of one voxel edge (spacing in `threeUtils` instancing). */
  voxelSize: number;
  isLayerEditorOpen?: boolean;
  onLayerEditorOpenChange?: (open: boolean) => void;
  /** After layer edits persist, parent may refetch or refresh derived state. */
  onVoxelsChanged?: () => void | Promise<void>;
  /** When `App` is loading project voxels over REST; takes priority in the status banner. */
  projectFetchStatus?: 'idle' | 'loading' | 'error';
  /** When set with `onPartitionsPanelOpenChange`, the partitions slide-over is controlled by the parent (avoids duplicate panels). */
  isPartitionsPanelOpen?: boolean;
  onPartitionsPanelOpenChange?: (open: boolean) => void;
  defaultMaterial?: number;
}

/** Exposes layer-editor clipboard helpers upward; inner UI stays encapsulated. */
export const ModelViewer = forwardRef<LayerEditorHandle, ModelViewerProps>(
  function ModelViewer(
    {
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
      onVoxelsChanged,
      projectFetchStatus = 'idle',
      isPartitionsPanelOpen: isPartitionsPanelOpenProp,
      onPartitionsPanelOpenChange,
      defaultMaterial,
    },
    ref,
  ) {
    /* --- DOM / Three scene object graph --- */
    const mountRef = useRef<HTMLDivElement | null>(null);
    const layerEditorRef = useRef<LayerEditorHandle | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const sceneRef = useRef<SceneSetup | null>(null);
    const modelRef = useRef<THREE.Mesh | null>(null);
    /** Reserved for aligning voxels to pre-centered STL space (see `renderVoxelInstanced`). */
    const modelOriginalCenterRef = useRef<THREE.Vector3 | null>(null);
    const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
    /** Maps GPU instance id → logical voxel index and coordinates for picking feedback. */
    const instanceIdMapRef = useRef<Map<number, VoxelData>>(new Map());
    const selectedCubeRef = useRef<number | null>(null);
    /* --- Pointer picking --- */
    const raycasterRef = useRef<THREE.Raycaster | null>(null);
    const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
    /** Latest props mirrored into refs so canvas event handlers see up-to-date selection callbacks. */
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
    /* Local viewer health for StatusMessage (STL load, empty scene); may be overridden by `projectFetchStatus`. */
    const [viewerStatus, setViewerStatus] = useState<
      'loading' | 'ready' | 'error'
    >('loading');
    const [viewerMessage, setViewerMessage] = useState<string | null>(null);
    /** Snapshot of the last voxel the HUD should describe (may overlap parent selection props). */
    const [selectedVoxel, setSelectedVoxel] = useState<{
      coord: number[];
      index: number;
    } | null>(null);
    const [isLayerEditorOpenLocal, setIsLayerEditorOpenLocal] = useState(false);
    const onLayerEditorOpenChangeRef = useRef(onLayerEditorOpenChange);
    onLayerEditorOpenChangeRef.current = onLayerEditorOpenChange;

    /** Forwards paste/selection helpers from the nested layer editor to the parent ref. */
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

    /** Layer editor drawer: parent-controlled when `isLayerEditorOpen` prop is passed; otherwise internal state. */
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
    const [localPartitionsOpen, setLocalPartitionsOpen] = useState(false);
    const partitionsPanelControlled =
      isPartitionsPanelOpenProp !== undefined &&
      onPartitionsPanelOpenChange !== undefined;
    const isPartitionsPanelOpen = partitionsPanelControlled
      ? isPartitionsPanelOpenProp!
      : localPartitionsOpen;
    const setPartitionsPanelOpen = useCallback(
      (open: boolean) => {
        if (partitionsPanelControlled) {
          onPartitionsPanelOpenChange!(open);
        } else {
          setLocalPartitionsOpen(open);
        }
      },
      [partitionsPanelControlled, onPartitionsPanelOpenChange],
    );

    /** Mutually exclusive slide-out: opening the layer editor closes partitions. */
    useEffect(() => {
      if (isLayerEditorOpen) setPartitionsPanelOpen(false);
    }, [isLayerEditorOpen, setPartitionsPanelOpen]);

    /** Instanced voxel colours: default mesh, active layer slice, selected voxel(s). */
    const COLOR_DEFAULT = 0x60a5fa;
    const COLOR_LAYER_SELECTED = 0xf59e0b;
    const COLOR_VOXEL_SELECTED = 0xef4444;

    /**
     * STL-backed scene: fetch mesh for `selectedModel`, draw optional voxels, run render loop
     * and pointer routing for layer / multi-select while this model is active.
     */
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

      /* Async mesh fetch: on success the STL becomes the shaded reference object; voxels overlay if present. */
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
              voxelSize,
              modelOriginalCenterRef.current,
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
        /* Surface network / API failures to the user instead of a blank canvas. */
        (error: unknown) => {
          console.error(`Failed to load STL model "${selectedModel}"`, error);
          if (!isMounted) return;
          const errorMsg = `Failed to load the STL model "${selectedModel}" from the server.`;
          setViewerStatus('error');
          setViewerMessage(errorMsg);
          onStatusChange('error');
        },
      );

      /* Keep projection matched to the viewer panel when the window layout changes. */
      const handleResize = () => {
        if (!mountRef.current || !sceneRef.current) return;
        const { clientWidth, clientHeight } = mountRef.current;
        sceneRef.current.camera.aspect = clientWidth / clientHeight;
        sceneRef.current.camera.updateProjectionMatrix();
        sceneRef.current.renderer.setSize(clientWidth, clientHeight);
      };

      window.addEventListener('resize', handleResize);

      /** Maps picks on the instanced voxel mesh to parent selection state (layer vs voxel, multi-select). */
      const handleClick = (event: MouseEvent) => {
        if (
          !sceneRef.current ||
          !raycasterRef.current ||
          !instancedMeshRef.current
        )
          return;

        const rect = sceneSetup.renderer.domElement.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y =
          -((event.clientY - rect.top) / rect.height) * 2 + 1;

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

            /* Modifier + click: extend or shrink the multi-voxel set used by layer tools. */
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

              // HUD should still name one “primary” voxel when multiple are selected.
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
              /** Plain click: choose layer for editing (and surface that choice to `App`). */
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

              if (
                onVoxelsSelectRef.current &&
                !event.ctrlKey &&
                !event.metaKey
              ) {
                onVoxelsSelectRef.current(new Set());
              }

              if (
                onVoxelSelectRef.current &&
                !event.ctrlKey &&
                !event.metaKey
              ) {
                onVoxelSelectRef.current(voxelInfo);
                setSelectedVoxel(voxelInfo);
              }
            }
            selectedCubeRef.current = instanceId;
          }
        } else {
          /* Clicked empty space: clear layer and voxel highlights in parent state. */
          if (onLayerSelectRef.current) onLayerSelectRef.current(null);
          if (onVoxelSelectRef.current) onVoxelSelectRef.current(null);
          if (onVoxelsSelectRef.current) onVoxelsSelectRef.current(new Set());

          selectedCubeRef.current = null;
          setSelectedVoxel(null);
        }
      };

      /** Double-click: alternate shortcut for single-voxel focus (distinct from layer picking). */
      const handleDoubleClick = (event: MouseEvent) => {
        if (
          !sceneRef.current ||
          !raycasterRef.current ||
          !instancedMeshRef.current
        )
          return;

        const rect = sceneSetup.renderer.domElement.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y =
          -((event.clientY - rect.top) / rect.height) * 2 + 1;

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
              if (onVoxelsSelectRef.current)
                onVoxelsSelectRef.current(new Set());
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

      /* Presentation loop while an STL is shown: gentle spin plus orbit controls. */
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

      /* Teardown when model changes or component unmounts: stop RAF, drop listeners, free GPU resources. */
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
    }, [selectedModel, voxelCoordinates, onStatusChange, voxelSize]);

    /**
     * Voxel-only projects (no STL): render the instanced grid and the same picking model.
     * When a scene already exists (e.g. after unloading STL), refresh voxel geometry without resetting the camera.
     */
    useEffect(() => {
      if (selectedModel || voxelCoordinates.length === 0) {
        return;
      }

      const mountElement = mountRef.current;
      if (!mountElement) return;

      const existingScene = sceneRef.current;
      /* Rebuild only voxel geometry when the user already has a scene (e.g. switched data without new STL). */
      if (existingScene != null) {
        const savedPosition = existingScene.camera.position.clone();
        const savedTarget = existingScene.controls.target.clone();

        if (instancedMeshRef.current) {
          existingScene.scene.remove(instancedMeshRef.current);
          instancedMeshRef.current.geometry.dispose();
          if (instancedMeshRef.current.material instanceof THREE.Material) {
            instancedMeshRef.current.material.dispose();
          }
        }

        const { mesh, instanceIdMap } = renderVoxelInstanced(
          existingScene.scene,
          voxelCoordinates,
          voxelSize,
          undefined,
          instancedMeshRef.current,
        );
        instancedMeshRef.current = mesh;
        instanceIdMapRef.current = instanceIdMap;

        existingScene.camera.position.copy(savedPosition);
        existingScene.controls.target.copy(savedTarget);
        existingScene.controls.update();
        setViewerStatus('ready');
        onStatusChange('ready');
        return;
      }

      setViewerStatus('loading');
      setViewerMessage(null);
      setSelectedVoxel(null);
      onStatusChange('loading');

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
        voxelSize,
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

      /** Same picking contract as the STL-backed scene: layers, multi-select, clears. */
      const handleClick = (event: MouseEvent) => {
        if (
          !sceneRef.current ||
          !raycasterRef.current ||
          !instancedMeshRef.current
        )
          return;

        const rect = sceneSetup.renderer.domElement.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y =
          -((event.clientY - rect.top) / rect.height) * 2 + 1;

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
                  currentSelected.delete(voxelInfo.index);
                } else {
                  currentSelected.add(voxelInfo.index);
                }

                if (onVoxelsSelectRef.current) {
                  onVoxelsSelectRef.current(
                    new Set(Array.from(currentSelected)),
                  );
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

              if (
                onVoxelsSelectRef.current &&
                !event.ctrlKey &&
                !event.metaKey
              ) {
                onVoxelsSelectRef.current(new Set());
              }

              if (
                onVoxelSelectRef.current &&
                !event.ctrlKey &&
                !event.metaKey
              ) {
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

      /** Double-click: toggle exclusive single-voxel highlight. */
      const handleDoubleClick = (event: MouseEvent) => {
        if (
          !sceneRef.current ||
          !raycasterRef.current ||
          !instancedMeshRef.current
        )
          return;

        const rect = sceneSetup.renderer.domElement.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y =
          -((event.clientY - rect.top) / rect.height) * 2 + 1;

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
              if (onVoxelsSelectRef.current)
                onVoxelsSelectRef.current(new Set());
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

      /* Voxel-only mode has no STL spin; loop exists to honor orbit/zoom input continuously. */
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
    }, [selectedModel, voxelCoordinates, onStatusChange, voxelSize]);

    /** Push selection and layer-edit highlights into per-instance colours on the voxel mesh. */
    useEffect(() => {
      if (!instancedMeshRef.current || instanceIdMapRef.current.size === 0)
        return;

      const mesh = instancedMeshRef.current;
      const col = layerAxis === 'x' ? 0 : layerAxis === 'y' ? 1 : 2;
      const getLayerValue = (coord: number[]) =>
        Math.round(coord[col] * 1e12) / 1e12;

      const dummyColor = new THREE.Color();

      /* Each instance: voxel highlight vs active layer slice on the current axis. */
      for (let i = 0; i < mesh.count; i++) {
        const data = instanceIdMapRef.current.get(i);
        if (!data) continue;

        const layerValue = getLayerValue(data.coord);

        const isSelectedVoxel =
          (selectedVoxelIndex !== null && data.index === selectedVoxelIndex) ||
          selectedVoxelIndices.has(data.index) ||
          (selectedVoxelIndicesArray &&
            selectedVoxelIndicesArray.includes(data.index));

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

    /** Status strip: project REST fetch errors override local viewer/STL errors for messaging. */
    const bannerStatus =
      projectFetchStatus === 'loading'
        ? 'loading'
        : projectFetchStatus === 'error'
          ? 'error'
          : viewerStatus;
    const bannerMessage =
      projectFetchStatus === 'error'
        ? (viewerMessage ??
          'Could not load project voxels. Check that the API URL matches the desktop backend (port 8765).')
        : viewerMessage;

    /** Canvas plus chrome: loading banner, voxel HUD, partition/layer tabs and drawers. */
    return (
      <div className="viewer" ref={mountRef}>
        {/* Viewer + project fetch status; explains missing model or API errors. */}
        <StatusMessage
          status={bannerStatus}
          message={bannerMessage}
          selectedModel={selectedModel}
        />
        {/* Short hint row when any voxel data exists. */}
        <Footer hasVoxels={voxelCoordinates.length > 0} />
        {/* Floating readout for the current pick or multi-select count. */}
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
        {/* Edge tabs: only one slide-over (partitions vs layer editor) should dominate. */}
        <button
          className={`partitions-tab ${isPartitionsPanelOpen ? 'open' : ''}`}
          onClick={() => {
            const nextOpen = !isPartitionsPanelOpen;
            if (nextOpen) setIsLayerEditorOpen(false);
            setPartitionsPanelOpen(nextOpen);
          }}
          title={isPartitionsPanelOpen ? 'Close Partitions' : 'Open Partitions'}
        >
          <span className="partitions-tab-text">Partitions</span>
        </button>
        {!partitionsPanelControlled && (
          <PartitionsPanel
            isOpen={isPartitionsPanelOpen}
            onClose={() => setPartitionsPanelOpen(false)}
            projectName={projectName || null}
            selectedPartition={selectedPartition}
            onPartitionSelect={onPartitionSelect || (() => {})}
          />
        )}
        <button
          className={`layer-editor-tab ${isLayerEditorOpen ? 'open' : ''}`}
          onClick={() => {
            const nextOpen = !isLayerEditorOpen;
            if (nextOpen) setPartitionsPanelOpen(false);
            setIsLayerEditorOpen(nextOpen);
          }}
          title={isLayerEditorOpen ? 'Close Layer Editor' : 'Open Layer Editor'}
        >
          <span className="layer-editor-tab-text">Layer Editor</span>
        </button>
        {/* 2D slice editor bound to the 3D layer selection and partition context. */}
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
          onVoxelsChanged={onVoxelsChanged}
          defaultMaterial={defaultMaterial}
        />
      </div>
    );
  },
);
