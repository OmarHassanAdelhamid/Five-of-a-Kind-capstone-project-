import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export interface SceneSetup {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  grid: THREE.GridHelper
}

export const createScene = (width: number, height: number): SceneSetup => {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#0f172a')

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
  camera.position.set(3, 3, 3)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true

  const ambientLight = new THREE.AmbientLight(0xf8fafc, 0.7)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.85)
  directionalLight.position.set(6, 6, 6)
  directionalLight.castShadow = true
  scene.add(directionalLight)

  const grid = new THREE.GridHelper(12, 24, 0x38bdf8, 0x1e293b)
  grid.position.y = -1.2
  scene.add(grid)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.minDistance = 1.5
  controls.maxDistance = 8

  return { scene, camera, renderer, controls, grid }
}

export const setupCameraForGeometry = (
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  geometry: THREE.BufferGeometry,
  grid: THREE.GridHelper,
): void => {
  geometry.computeBoundingSphere()
  const radius = geometry.boundingSphere?.radius ?? 1
  const distance = Math.max(radius * 2.5, 3)

  camera.position.set(distance, distance, distance)
  camera.near = Math.max(radius / 100, 0.01)
  camera.far = Math.max(radius * 20, 100)
  camera.updateProjectionMatrix()

  controls.target.set(0, 0, 0)
  controls.minDistance = Math.max(radius * 0.2, 0.5)
  controls.maxDistance = Math.max(radius * 10, distance * 1.5)
  controls.update()

  const gridScale = Math.max(radius * 2.5, 12)
  grid.scale.setScalar(gridScale / 12)
  grid.position.y = -radius * 0.8
}

export const createModelMaterial = (): THREE.MeshStandardMaterial => {
  return new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    metalness: 0.35,
    roughness: 0.25,
    emissive: new THREE.Color('#1e3a8a'),
    emissiveIntensity: 0.15,
  })
}

export const calculateVoxelSize = (
  coordinates: number[][],
  modelSize?: number,
): number => {
  let voxelSize: number

  if (modelSize && modelSize > 0) {
    voxelSize = modelSize * 0.05
  } else if (coordinates.length > 1) {
    const firstCoord = coordinates[0]
    const secondCoord = coordinates[1]
    const spacing = Math.sqrt(
      Math.pow(secondCoord[0] - firstCoord[0], 2) +
      Math.pow(secondCoord[1] - firstCoord[1], 2) +
      Math.pow(secondCoord[2] - firstCoord[2], 2),
    )
    if (spacing > 0.001 && spacing < 10) {
      voxelSize = spacing * 0.8
    } else {
      voxelSize = 0.1
    }
  } else {
    voxelSize = 0.1
  }

  if (modelSize) {
    voxelSize = Math.max(voxelSize, modelSize * 0.005)
    voxelSize = Math.min(voxelSize, modelSize * 0.05)
  } else {
    voxelSize = Math.max(voxelSize, 0.01)
    voxelSize = Math.min(voxelSize, 1.0)
  }

  return voxelSize
}

export const calculateCenterOffset = (
  coordinates: number[][],
  modelOriginalCenter?: THREE.Vector3 | null,
): THREE.Vector3 => {
  if (modelOriginalCenter) {
    return modelOriginalCenter.clone().negate()
  }

  const voxelBbox = new THREE.Box3()
  coordinates.forEach((coord) => {
    voxelBbox.expandByPoint(new THREE.Vector3(coord[0], coord[1], coord[2]))
  })
  const voxelCenterPoint = new THREE.Vector3()
  voxelBbox.getCenter(voxelCenterPoint)
  return voxelCenterPoint.clone().negate()
}

export const renderVoxelCubes = (
  scene: THREE.Scene,
  coordinates: number[][],
  _modelSize?: number, // Unused but kept for API compatibility
  modelOriginalCenter?: THREE.Vector3 | null,
  existingCubes?: THREE.Mesh[],
  selectedLayerZ?: number | null,
  layerAxis: 'z' | 'x' | 'y' = 'z',
  isLayerEditingMode?: boolean,
): { cubes: THREE.Mesh[]; cubeToCoordMap: Map<THREE.Mesh, { coord: number[]; index: number }> } => {
  // Remove existing cubes if provided
  if (existingCubes) {
    existingCubes.forEach((cube) => {
      scene.remove(cube)
      cube.geometry.dispose()
      if (cube.material instanceof THREE.Material) {
        cube.material.dispose()
      }
    })
  }

  const cubeToCoordMap = new Map<THREE.Mesh, { coord: number[]; index: number }>()

  if (coordinates.length === 0) {
    return { cubes: [], cubeToCoordMap }
  }

  // const voxelSize = calculateVoxelSize(coordinates, modelSize)
  const voxelSize = 1
  const centerOffset = calculateCenterOffset(coordinates, modelOriginalCenter)
  const cubeGeometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize)

  const col = layerAxis === 'x' ? 0 : layerAxis === 'y' ? 1 : 2
  const getLayerValue = (c: number[]): number =>
    Math.round(c[col] * 1e12) / 1e12

  const layerZMap = new Map<number, number[]>()
  coordinates.forEach((coord, index) => {
    const v = getLayerValue(coord)
    if (!layerZMap.has(v)) layerZMap.set(v, [])
    layerZMap.get(v)!.push(index)
  })

  const sortedLayerZs = Array.from(layerZMap.keys()).sort((a, b) => a - b)

  const isInSelectedLayer = (c: number[]): boolean => {
    if (selectedLayerZ === null || selectedLayerZ === undefined) return false
    return Math.abs(getLayerValue(c) - selectedLayerZ) < 1e-9
  }

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
  ]

  // Helper function to get color for a layer based on its index
  const getLayerColor = (layerZ: number): number => {
    const layerIndex = sortedLayerZs.indexOf(layerZ)
    if (layerIndex === -1) return 0xff0000 // Default red

    // Cycle through the color palette
    return layerColors[layerIndex % layerColors.length]
  }

  // Default neutral color when layer editing is off
  const defaultVoxelColor = 0x60a5fa; // Light blue

  const cubes: THREE.Mesh[] = []
  coordinates.forEach((coord, index) => {
    const [x, y, z] = coord
    const position = new THREE.Vector3(x, y, z).add(centerOffset)
    const layerZ = getLayerValue(coord)
    const isSelected = isInSelectedLayer(coord)

    // Get base color - use layer color only if layer editing mode is enabled
    const baseColor = isLayerEditingMode ? getLayerColor(layerZ) : defaultVoxelColor

    // Create material with appropriate color
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      metalness: 0.3,
      roughness: 0.7,
      opacity: isSelected && isLayerEditingMode ? 1.0 : 0.6, // Selected layers are fully opaque only in editing mode
      transparent: !(isSelected && isLayerEditingMode),
      emissive: isSelected && isLayerEditingMode ? new THREE.Color(baseColor).multiplyScalar(0.3) : new THREE.Color(0x000000),
      emissiveIntensity: isSelected && isLayerEditingMode ? 0.3 : 0,
    })

    const cube = new THREE.Mesh(cubeGeometry.clone(), material)
    cube.position.copy(position)
    cube.castShadow = true
    cube.receiveShadow = true
    // Store user data for easy identification
    cube.userData = {
      coord,
      index,
      originalCoord: [...coord],
      isInSelectedLayer: isSelected,
      layerZ: layerZ
    }
    scene.add(cube)
    cubes.push(cube)
    // Store mapping for click detection
    cubeToCoordMap.set(cube, { coord, index })
  })

  return { cubes, cubeToCoordMap }
}

export const disposeScene = (
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  controls: OrbitControls,
  cubes: THREE.Mesh[],
): void => {
  cubes.forEach((cube) => {
    scene.remove(cube)
    cube.geometry.dispose()
    if (cube.material instanceof THREE.Material) {
      cube.material.dispose()
    }
  })

  controls.dispose()
  renderer.dispose()
  scene.traverse((object: THREE.Object3D) => {
    if ((object as THREE.Mesh).isMesh) {
      const mesh = object as THREE.Mesh
      mesh.geometry.dispose()
      const material = mesh.material
      if (Array.isArray(material)) {
        material.forEach((mat) => mat.dispose())
      } else if (material) {
        material.dispose()
      }
    }
  })
}

