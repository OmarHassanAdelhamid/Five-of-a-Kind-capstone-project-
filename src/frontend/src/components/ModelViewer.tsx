import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import {
  createScene,
  setupCameraForGeometry,
  createModelMaterial,
  renderVoxelCubes,
  disposeScene,
  type SceneSetup,
} from '../utils/threeUtils'
import { API_BASE_URL } from '../utils/constants'
import { StatusMessage } from './StatusMessage'

//HEAVILY INFLUENCED BY STL LOADER EXAMPLE https://sbcode.net/threejs/loaders-stl/

interface ModelViewerProps {
  selectedModel: string | null
  voxelCoordinates: number[][]
  onStatusChange: (status: 'loading' | 'ready' | 'error') => void
}

export const ModelViewer = ({
  selectedModel,
  voxelCoordinates,
  onStatusChange,
}: ModelViewerProps) => {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const sceneRef = useRef<SceneSetup | null>(null)
  const modelRef = useRef<THREE.Mesh | null>(null)
  const cubesRef = useRef<THREE.Mesh[]>([])
  const cubeToCoordMapRef = useRef<Map<THREE.Mesh, { coord: number[]; index: number }>>(new Map())
  const selectedCubeRef = useRef<THREE.Mesh | null>(null)
  const raycasterRef = useRef<THREE.Raycaster | null>(null)
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const [viewerStatus, setViewerStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [viewerMessage, setViewerMessage] = useState<string | null>(null)
  const [selectedVoxel, setSelectedVoxel] = useState<{ coord: number[]; index: number } | null>(null)

  useEffect(() => {
    if (!selectedModel) {
      return
    }

    setViewerStatus('loading')
    setViewerMessage(null)
    setSelectedVoxel(null) // Clear selection when model changes
    selectedCubeRef.current = null
    onStatusChange('loading')
    const mountElement = mountRef.current
    if (!mountElement) {
      return
    }

    let isMounted = true

    const { clientWidth: width, clientHeight: height } = mountElement
    const sceneSetup = createScene(width, height)
    sceneRef.current = sceneSetup
    mountElement.appendChild(sceneSetup.renderer.domElement)

    // Initialize raycaster for click detection
    const raycaster = new THREE.Raycaster()
    raycasterRef.current = raycaster

    const loader = new STLLoader()

    loader.load(
      `${API_BASE_URL}/api/models/${encodeURIComponent(selectedModel)}`,
      (geometry: THREE.BufferGeometry) => {
        if (!isMounted) return

        geometry.computeBoundingBox()
        const originalBbox = geometry.boundingBox
        let originalCenter: THREE.Vector3 | null = null
        if (originalBbox) {
          originalCenter = new THREE.Vector3()
          originalBbox.getCenter(originalCenter)
        }

        geometry.center()
        geometry.computeVertexNormals()
        geometry.computeBoundingSphere()
        geometry.computeBoundingBox()

        const boundingBox = geometry.boundingBox
        if (boundingBox) {
          const size = new THREE.Vector3()
          boundingBox.getSize(size)
          const modelSize = Math.max(size.x, size.y, size.z)

          setupCameraForGeometry(
            sceneSetup.camera,
            sceneSetup.controls,
            geometry,
            sceneSetup.grid,
          )

          const material = createModelMaterial()
          const model = new THREE.Mesh(geometry, material)
          model.castShadow = true
          model.receiveShadow = true
          sceneSetup.scene.add(model)
          modelRef.current = model

          if (voxelCoordinates.length > 0) {
            const { cubes, cubeToCoordMap } = renderVoxelCubes(
              sceneSetup.scene,
              voxelCoordinates,
              modelSize,
              originalCenter,
              cubesRef.current,
            )
            cubesRef.current = cubes
            cubeToCoordMapRef.current = cubeToCoordMap
            // Reset selection when voxels change
            selectedCubeRef.current = null
            setSelectedVoxel(null)
          } else {
            // No voxels - clear selection
            selectedCubeRef.current = null
            setSelectedVoxel(null)
          }

          setViewerStatus('ready')
          onStatusChange('ready')
        } else {
          const radius = geometry.boundingSphere?.radius ?? 1
          setupCameraForGeometry(
            sceneSetup.camera,
            sceneSetup.controls,
            geometry,
            sceneSetup.grid,
          )

          const material = createModelMaterial()
          const model = new THREE.Mesh(geometry, material)
          model.castShadow = true
          model.receiveShadow = true
          sceneSetup.scene.add(model)
          modelRef.current = model

          if (voxelCoordinates.length > 0) {
            const { cubes, cubeToCoordMap } = renderVoxelCubes(
              sceneSetup.scene,
              voxelCoordinates,
              radius * 2,
              undefined,
              cubesRef.current,
            )
            cubesRef.current = cubes
            cubeToCoordMapRef.current = cubeToCoordMap
            // Reset selection when voxels change
            selectedCubeRef.current = null
            setSelectedVoxel(null)
          } else {
            // No voxels - clear selection
            selectedCubeRef.current = null
            setSelectedVoxel(null)
          }

          setViewerStatus('ready')
          onStatusChange('ready')
        }
      },
      undefined,
      (error: unknown) => {
        console.error(`Failed to load STL model "${selectedModel}"`, error)
        if (!isMounted) return
        const errorMsg = `Failed to load the STL model "${selectedModel}" from the server.`
        setViewerStatus('error')
        setViewerMessage(errorMsg)
        onStatusChange('error')
      },
    )

    const handleResize = () => {
      if (!mountRef.current || !sceneRef.current) return
      const { clientWidth, clientHeight } = mountRef.current
      sceneRef.current.camera.aspect = clientWidth / clientHeight
      sceneRef.current.camera.updateProjectionMatrix()
      sceneRef.current.renderer.setSize(clientWidth, clientHeight)
    }

    window.addEventListener('resize', handleResize)

    // Handle click events on voxels
    const handleClick = (event: MouseEvent) => {
      if (!sceneRef.current || !raycasterRef.current || cubesRef.current.length === 0) return

      const rect = sceneSetup.renderer.domElement.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, sceneRef.current.camera)
      const intersects = raycasterRef.current.intersectObjects(cubesRef.current, false)

      if (intersects.length > 0) {
        const clickedCube = intersects[0].object as THREE.Mesh
        
        // Reset previous selection
        if (selectedCubeRef.current && selectedCubeRef.current !== clickedCube) {
          const prevMaterial = selectedCubeRef.current.material as THREE.MeshStandardMaterial
          prevMaterial.color.setHex(0xff0000) // Red (default)
          prevMaterial.emissive.setHex(0x000000)
        }

        // Highlight clicked cube
        const material = clickedCube.material as THREE.MeshStandardMaterial
        material.color.setHex(0x00ff00) // Green (selected)
        material.emissive.setHex(0x003300)
        material.emissiveIntensity = 0.3

        selectedCubeRef.current = clickedCube

        // Set selected voxel info
        const voxelInfo = cubeToCoordMapRef.current.get(clickedCube)
        if (voxelInfo) {
          setSelectedVoxel(voxelInfo)
        }
      } else {
        // Clicked on empty space - deselect
        if (selectedCubeRef.current) {
          const material = selectedCubeRef.current.material as THREE.MeshStandardMaterial
          material.color.setHex(0xff0000) // Red (default)
          material.emissive.setHex(0x000000)
          selectedCubeRef.current = null
          setSelectedVoxel(null)
        }
      }
    }

    sceneSetup.renderer.domElement.addEventListener('click', handleClick)

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      if (modelRef.current) {
        modelRef.current.rotation.y += 0.003
      }
      if (sceneRef.current) {
        sceneRef.current.controls.update()
        sceneRef.current.renderer.render(
          sceneRef.current.scene,
          sceneRef.current.camera,
        )
      }
    }

    animate()

    return () => {
      isMounted = false
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      window.removeEventListener('resize', handleResize)

      if (sceneRef.current && sceneRef.current.renderer) {
        sceneRef.current.renderer.domElement.removeEventListener('click', handleClick)
        disposeScene(
          sceneRef.current.scene,
          sceneRef.current.renderer,
          sceneRef.current.controls,
          cubesRef.current,
        )
      }

      if (sceneRef.current && mountElement.contains(sceneRef.current.renderer.domElement)) {
        mountElement.removeChild(sceneRef.current.renderer.domElement)
      }

      sceneRef.current = null
      modelRef.current = null
      cubesRef.current = []
      cubeToCoordMapRef.current.clear()
      selectedCubeRef.current = null
      raycasterRef.current = null
      setSelectedVoxel(null)
    }
  }, [selectedModel, voxelCoordinates, onStatusChange])

  return (
    <div className="viewer" ref={mountRef}>
      <StatusMessage
        status={viewerStatus}
        message={viewerMessage}
        selectedModel={selectedModel}
      />
      {selectedVoxel && (
        <div className="voxel-info">
          <h4>Selected Voxel</h4>
          <p>Index: {selectedVoxel.index}</p>
          <p>
            Position: ({selectedVoxel.coord[0].toFixed(3)}, {selectedVoxel.coord[1].toFixed(3)},{' '}
            {selectedVoxel.coord[2].toFixed(3)})
          </p>
        </div>
      )}
    </div>
  )
}

