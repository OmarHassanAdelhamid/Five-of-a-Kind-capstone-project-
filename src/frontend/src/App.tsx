import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import './App.css'

//HEAVILY INFLUENCED BY STL LOADER EXAMPLE https://sbcode.net/threejs/loaders-stl/

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:8000'

function App() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  const fetchAvailableModels = useCallback(async (): Promise<string[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/list-stl`)
      if (!response.ok) {
        throw new Error(`Failed to fetch models (${response.status})`)
      }

      const modelList = (await response.json()) as string[]
      const filtered = modelList.filter((name) => name.toLowerCase().endsWith('.stl'))
      setModels(filtered)
      return filtered
    } catch (error) {
      console.error('Failed to fetch STL models', error)
      setModels([])
      throw error
    }
  }, [])

  useEffect(() => {
    const initialiseModels = async () => {
      setStatus('loading')
      setErrorMessage(null)

      try {
        const modelList = await fetchAvailableModels()
        if (modelList.length > 0) {
          setSelectedModel((current) =>
            current && modelList.includes(current) ? current : modelList[0],
          )
        } else {
          setSelectedModel(null)
          setStatus('error')
          setErrorMessage('No STL models available yet. Upload a file to get started.')
        }
      } catch {
        setSelectedModel(null)
        setStatus('error')
        setErrorMessage('Unable to fetch STL models from the server.')
      }
    }

    void initialiseModels()
  }, [fetchAvailableModels])

  useEffect(() => {
    if (!selectedModel) {
      return
    }

    setStatus('loading')
    setErrorMessage(null)

    const mountElement = mountRef.current
    if (!mountElement) {
      return
    }

    let isMounted = true

    const { clientWidth: width, clientHeight: height } = mountElement

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0f172a')

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(3, 3, 3)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    mountElement.appendChild(renderer.domElement)

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

    const loader = new STLLoader()
    let model: THREE.Mesh | null = null

    loader.load(
      `${API_BASE_URL}/api/models/${encodeURIComponent(selectedModel)}`,
      (geometry: THREE.BufferGeometry) => {
        if (!isMounted) return

        geometry.center()
        geometry.computeVertexNormals()
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

        const material = new THREE.MeshStandardMaterial({
          color: 0x93c5fd,
          metalness: 0.35,
          roughness: 0.25,
          emissive: new THREE.Color('#1e3a8a'),
          emissiveIntensity: 0.15,
        })

        model = new THREE.Mesh(geometry, material)
        model.castShadow = true
        model.receiveShadow = true
        scene.add(model)

        const gridScale = Math.max(radius * 2.5, 12)
        grid.scale.setScalar(gridScale / 12)
        grid.position.y = -radius * 0.8

        setStatus('ready')
      },
      undefined,
      (error: unknown) => {
        console.error(`Failed to load STL model "${selectedModel}"`, error)
        if (!isMounted) return
        setStatus('error')
        setErrorMessage(`Failed to load the STL model "${selectedModel}" from the server.`)
      },
    )

    const handleResize = () => {
      if (!mountRef.current) return
      const { clientWidth, clientHeight } = mountRef.current
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight)
    }

    window.addEventListener('resize', handleResize)

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      if (model) {
        model.rotation.y += 0.003
      }
      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    return () => {
      isMounted = false
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      window.removeEventListener('resize', handleResize)
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

      if (mountElement.contains(renderer.domElement)) {
        mountElement.removeChild(renderer.domElement)
      }
    }
  }, [selectedModel])

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.name.toLowerCase().endsWith('.stl')) {
      setUploadState('error')
      setUploadMessage('Please select a file with the .stl extension.')
      event.target.value = ''
      return
    }

    setUploadState('uploading')
    setUploadMessage(`Uploading ${file.name} ...`)

    const formData = new FormData()
    formData.append('stl_file', file)

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload-stl`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Upload failed')
      }

      const data = (await response.json()) as { message?: string }

      setUploadState('success')
      setUploadMessage(data.message ?? 'Upload complete.')

      try {
        const modelList = await fetchAvailableModels()
        const nextModel = modelList.at(-1) ?? null

        if (nextModel) {
          setSelectedModel(nextModel)
        }
      } catch {
        setStatus('error')
        setErrorMessage('Upload succeeded, but refreshing available models failed.')
      }
    } catch (error) {
      console.error('Failed to upload STL file', error)
      setUploadState('error')
      setUploadMessage(error instanceof Error ? error.message : 'Failed to upload STL file. Please try again.')
    } finally {
      event.target.value = ''
    }
  }

  const handleModelChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value

    if (!value) {
      setSelectedModel(null)
      setStatus('error')
      setErrorMessage('Select an STL model to view.')
      return
    }

    setErrorMessage(null)
    setSelectedModel(value)
  }

  return (
    <div className="app">
    
      <div className="viewer" ref={mountRef}>
        {status !== 'ready' && (
          <div className={`status ${status}`}>
            {status === 'loading'
              ? selectedModel
                ? `Loading ${selectedModel}…`
                : 'Loading STL model…'
              : errorMessage}
          </div>
        )}
      </div>
      <section className="actions">
        <div className="model-selector">
          <label htmlFor="model-select">Active model</label>
          <select
            id="model-select"
            value={selectedModel ?? ''}
            onChange={handleModelChange}
            disabled={models.length === 0 || status === 'loading'}
          >
            {models.length === 0 && <option value="">No models available</option>}
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
        <label className={`upload-button ${uploadState}`}>
          <input
            type="file"
            accept=".stl"
            onChange={handleUpload}
            disabled={uploadState === 'uploading'}
          />
          <span>{uploadState === 'uploading' ? 'Uploading…' : 'Upload STL File'}</span>
        </label>
        {uploadMessage && (
          <p className={`upload-message ${uploadState}`}>{uploadMessage}</p>
        )}
        {models.length === 0 && (
          <p className="empty-copy">No STL models available yet. Upload one to begin.</p>
        )}
      </section>
      <footer>
        <div className="metadata">
          <span>
            Backend API:&nbsp;
            <code>{API_BASE_URL}</code>
          </span>
          <span>
            Models:&nbsp;
            <code>{models.length}</code>
          </span>
          <span>
            Active:&nbsp;
            <code>{selectedModel ?? 'None'}</code>
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
