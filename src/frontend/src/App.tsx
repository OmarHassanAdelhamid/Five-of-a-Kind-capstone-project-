import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import './App.css'

//HEAVILY INFLUENCED BY STL LOADER EXAMPLE https://sbcode.net/threejs/loaders-stl/

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:8000'
const MODEL_ENDPOINT = '/api/models/sphere'

function App() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
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
      `${API_BASE_URL}${MODEL_ENDPOINT}`,
      (geometry: THREE.BufferGeometry) => {
        if (!isMounted) return

        geometry.center()
        geometry.computeVertexNormals()

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

        setStatus('ready')
      },
      undefined,
      (error: unknown) => {
        console.error('Failed to load STL model', error)
        if (!isMounted) return
        setStatus('error')
        setErrorMessage('Failed to load the STL model from the server.')
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
  }, [])

  return (
    <div className="app">
     
      <div className="viewer" ref={mountRef}>
        {status !== 'ready' && (
          <div className={`status ${status}`}>
            {status === 'loading' ? 'Loading STL model…' : errorMessage}
          </div>
        )}
      </div>
      <footer>
        <div className="metadata">
          <span>
            Backend API:&nbsp;
            <code>{API_BASE_URL}</code>
          </span>
          <span>
            Endpoint:&nbsp;
            <code>{MODEL_ENDPOINT}</code>
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
