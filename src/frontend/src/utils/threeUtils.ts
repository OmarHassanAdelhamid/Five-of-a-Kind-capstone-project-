import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export interface SceneSetup {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  grid: THREE.GridHelper
}

export interface VoxelData {
  coord: number[]
  index: number
  originalCoord: number[]
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

export const setupCameraForVoxels = (
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  coordinates: number[][],
  grid: THREE.GridHelper,
): void => {
  const box = new THREE.Box3()
  coordinates.forEach((coord) => {
    box.expandByPoint(new THREE.Vector3(coord[0], coord[1], coord[2]))
  })
  const size = new THREE.Vector3()
  box.getSize(size)
  const radius = Math.max(size.x, size.y, size.z) * 0.5
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

/**
 * Renders voxels using THREE.InstancedMesh for performance.
 */
export const renderVoxelInstanced = (
  scene: THREE.Scene,
  coordinates: number[][],
  modelOriginalCenter?: THREE.Vector3 | null,
  existingMesh?: THREE.InstancedMesh | null,
): { 
  mesh: THREE.InstancedMesh; 
  instanceIdMap: Map<number, VoxelData> 
} => {
  if (existingMesh) {
    scene.remove(existingMesh)
    existingMesh.geometry.dispose()
    if (existingMesh.material instanceof THREE.Material) {
      existingMesh.material.dispose()
    }
  }

  const instanceIdMap = new Map<number, VoxelData>()

  if (coordinates.length === 0) {
    const emptyGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1)
    const emptyMat = new THREE.MeshStandardMaterial()
    const emptyMesh = new THREE.InstancedMesh(emptyGeo, emptyMat, 0)
    return { mesh: emptyMesh, instanceIdMap }
  }

  const voxelSize = 0.1 // Can be changed to a variable if needed
  const centerOffset = calculateCenterOffset(coordinates, modelOriginalCenter)
  
  const geometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize)
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff, 
    metalness: 0.2,
    roughness: 0.5,
  })

  const count = coordinates.length
  const mesh = new THREE.InstancedMesh(geometry, material, count)
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
  mesh.castShadow = true
  mesh.receiveShadow = true

  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  const defaultColor = 0x60a5fa 

  coordinates.forEach((coord, index) => {
    const [x, y, z] = coord
    
    // Set Position
    dummy.position.set(x, y, z).add(centerOffset)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)

    // Set Initial Color
    color.setHex(defaultColor)
    mesh.setColorAt(index, color)

    // Map instance ID (index) to data
    instanceIdMap.set(index, {
      coord,
      index, // This is the original index in the coordinates array
      originalCoord: [...coord]
    })
  })

  mesh.instanceMatrix.needsUpdate = true
  mesh.instanceColor!.needsUpdate = true
  mesh.computeBoundingSphere()
  
  scene.add(mesh)

  return { mesh, instanceIdMap }
}

export const disposeScene = (
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  controls: OrbitControls,
  objectsToDispose: (THREE.Mesh | THREE.InstancedMesh)[] | THREE.Mesh | THREE.InstancedMesh | null,
): void => {
  
  const toDispose = Array.isArray(objectsToDispose) 
    ? objectsToDispose 
    : objectsToDispose 
      ? [objectsToDispose] 
      : []

  toDispose.forEach((obj) => {
    scene.remove(obj)
    obj.geometry.dispose()
    if (obj.material instanceof THREE.Material) {
      obj.material.dispose()
    } else if (Array.isArray(obj.material)) {
      obj.material.forEach(m => m.dispose())
    }
  })

  controls.dispose()
  renderer.dispose()
  
  scene.traverse((object: THREE.Object3D) => {
    if ((object as THREE.Mesh).isMesh || (object as THREE.InstancedMesh).isInstancedMesh) {
      const mesh = object as THREE.Mesh | THREE.InstancedMesh
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