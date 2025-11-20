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
  const [viewerStatus, setViewerStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [viewerMessage, setViewerMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedModel) {
      return
    }

    setViewerStatus('loading')
    setViewerMessage(null)
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
            const cubes = renderVoxelCubes(
              sceneSetup.scene,
              voxelCoordinates,
              modelSize,
              originalCenter,
              cubesRef.current,
            )
            cubesRef.current = cubes
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
            const cubes = renderVoxelCubes(
              sceneSetup.scene,
              voxelCoordinates,
              radius * 2,
              undefined,
              cubesRef.current,
            )
            cubesRef.current = cubes
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

      if (sceneRef.current) {
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
    }
  }, [selectedModel, voxelCoordinates, onStatusChange])

  return (
    <div className="viewer" ref={mountRef}>
      <StatusMessage
        status={viewerStatus}
        message={viewerMessage}
        selectedModel={selectedModel}
      />
    </div>
  )
}

