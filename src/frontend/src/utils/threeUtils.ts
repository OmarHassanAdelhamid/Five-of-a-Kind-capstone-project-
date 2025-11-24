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
  modelSize?: number,
  modelOriginalCenter?: THREE.Vector3 | null,
  existingCubes?: THREE.Mesh[],
): THREE.Mesh[] => {
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

  if (coordinates.length === 0) return []

  const voxelMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    metalness: 0.3,
    roughness: 0.7,
  })

  const voxelSize = calculateVoxelSize(coordinates, modelSize)
  const centerOffset = calculateCenterOffset(coordinates, modelOriginalCenter)
  const cubeGeometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize)

  const cubes: THREE.Mesh[] = []
  coordinates.forEach((coord) => {
    const [x, y, z] = coord
    const position = new THREE.Vector3(x, y, z).add(centerOffset)
    const cube = new THREE.Mesh(cubeGeometry, voxelMaterial)
    cube.position.copy(position)
    cube.castShadow = true
    cube.receiveShadow = true
    scene.add(cube)
    cubes.push(cube)
  })

  return cubes
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

