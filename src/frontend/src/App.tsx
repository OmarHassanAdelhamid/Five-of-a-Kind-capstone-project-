import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { ModelViewer } from './components/ModelViewer'
import { ModelSelector } from './components/ModelSelector'
import { UploadButton } from './components/UploadButton'
import { ProjectSelector } from './components/ProjectSelector'
import { UploadMessage } from './components/UploadMessage'
import { Footer } from './components/Footer'
import {
  fetchAvailableModels,
  fetchAvailableProjects,
  fetchVoxelized,
  uploadSTLFile,
  voxelizeModel,
  downloadVoxelCSV,
} from './utils/api'

function App() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [uploadState, setUploadState] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle')
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [availableProjects, setAvailableProjects] = useState<string[]>([])
  const [voxelCoordinates, setVoxelCoordinates] = useState<number[][]>([])
  const [voxelizeState, setVoxelizeState] = useState<
    'idle' | 'voxelizing' | 'success' | 'error'
  >('idle')
  const [voxelizeMessage, setVoxelizeMessage] = useState<string | null>(null)
  const [voxelSize, setVoxelSize] = useState<string>('0.1')

  const fetchModels = useCallback(async (): Promise<string[]> => {
    try {
      const modelList = await fetchAvailableModels()
      setModels(modelList)
      return modelList
    } catch (error) {
      console.error('Failed to fetch STL models', error)
      setModels([])
      throw error
    }
  }, [])

  const fetchProjects = useCallback(async (): Promise<string[]> => {
    try {
      const projectList = await fetchAvailableProjects()
      setAvailableProjects(projectList)
      return projectList
    } catch (error) {
      console.error('Failed to fetch available projects', error)
      setAvailableProjects([])
      return []
    }
  }, [])

  const fetchVoxels = useCallback(async (project: string) => {
    try {
      const coordinates = await fetchVoxelized(project)
      setVoxelCoordinates(coordinates)
      return coordinates
    } catch (error) {
      console.error('Failed to fetch voxelized coordinates', error)
      setVoxelCoordinates([])
      throw error
    }
  }, [])

  useEffect(() => {
    const initialiseModels = async () => {
      setStatus('loading')

      try {
        const modelList = await fetchModels()
        if (modelList.length > 0) {
          setSelectedModel((current) =>
            current && modelList.includes(current) ? current : modelList[0],
          )
        } else {
          setSelectedModel(null)
          setStatus('error')
        }
      } catch {
        setSelectedModel(null)
        setStatus('error')
      }
    }

    void initialiseModels()
    void fetchProjects()
  }, [fetchModels, fetchProjects])

  const handleStatusChange = useCallback(
    (newStatus: 'loading' | 'ready' | 'error') => {
      setStatus(newStatus)
    },
    [],
  )

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.stl')) {
        setUploadState('error')
        setUploadMessage('Please select a file with the .stl extension.')
        return
      }

      setUploadState('uploading')
      setUploadMessage(`Uploading ${file.name} ...`)

      try {
        const data = await uploadSTLFile(file)
        setUploadState('success')
        setUploadMessage(data.message ?? 'Upload complete.')

        try {
          const modelList = await fetchModels()
          const nextModel = modelList.at(-1) ?? null

          if (nextModel) {
            setSelectedModel(nextModel)
          }
        } catch {
          setStatus('error')
        }
      } catch (error) {
        console.error('Failed to upload STL file', error)
        setUploadState('error')
        setUploadMessage(
          error instanceof Error
            ? error.message
            : 'Failed to upload STL file. Please try again.',
        )
      }
    },
    [fetchModels],
  )

  const handleModelChange = useCallback((model: string) => {
    setSelectedModel(model)
  }, [])

  const handleLoadVoxels = useCallback(async () => {
    if (!projectName.trim()) {
      return
    }

    try {
      setStatus('loading')
      const coordinates = await fetchVoxels(projectName)
      if (coordinates.length > 0) {
        setVoxelCoordinates(coordinates)
        setStatus('ready')
      } else {
        setStatus('error')
      }
    } catch (error) {
      setStatus('error')
    }
  }, [projectName, fetchVoxels])

  const handleVoxelize = useCallback(async () => {
    if (!selectedModel) {
      setVoxelizeState('error')
      setVoxelizeMessage('Please select a model first.')
      return
    }

    const size = parseFloat(voxelSize)
    if (isNaN(size) || size <= 0) {
      setVoxelizeState('error')
      setVoxelizeMessage('Please enter a valid voxel size (greater than 0).')
      return
    }

    const defaultProjectName = selectedModel.replace('.stl', '') + '-voxels'
    setVoxelizeState('voxelizing')
    setVoxelizeMessage(`Voxelizing ${selectedModel}...`)

    try {
      const result = await voxelizeModel(selectedModel, size, defaultProjectName)
      setVoxelizeState('success')
      setVoxelizeMessage(result.message || 'Voxelization complete!')
      
      // Refresh project list
      await fetchProjects()
      
      // Optionally load the new voxels
      setProjectName(defaultProjectName)
    } catch (error) {
      console.error('Failed to voxelize model', error)
      setVoxelizeState('error')
      setVoxelizeMessage(
        error instanceof Error
          ? error.message
          : 'Failed to voxelize model. Please try again.',
      )
    }
  }, [selectedModel, voxelSize, fetchProjects])

  const handleDownloadCSV = useCallback(async () => {
    if (!projectName.trim()) {
      setVoxelizeMessage('Please select a project to download.')
      return
    }

    try {
      const blob = await downloadVoxelCSV(projectName)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectName}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download CSV', error)
      setVoxelizeMessage(
        error instanceof Error
          ? error.message
          : 'Failed to download CSV. Please try again.',
      )
    }
  }, [projectName])

  return (
    <div className="app">
      <ModelViewer
        selectedModel={selectedModel}
        voxelCoordinates={voxelCoordinates}
        onStatusChange={handleStatusChange}
      />
      <section className="actions">
        <ModelSelector
          models={models}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          disabled={status === 'loading'}
        />
        <UploadButton uploadState={uploadState} onUpload={handleUpload} />
        <UploadMessage uploadState={uploadState} message={uploadMessage} />
        {models.length === 0 && (
          <p className="empty-copy">
            No STL models available yet. Upload one to begin.
          </p>
        )}
        <ProjectSelector
          availableProjects={availableProjects}
          projectName={projectName}
          onProjectNameChange={setProjectName}
          onLoadVoxels={handleLoadVoxels}
          disabled={status === 'loading'}
          voxelCount={voxelCoordinates.length}
        />
        <div className="voxelize-section">
          <h3>Voxelize Model</h3>
          <div className="voxelize-controls">
            <label htmlFor="voxel-size">
              Voxel Size:
              <input
                id="voxel-size"
                type="number"
                step="0.01"
                min="0.01"
                value={voxelSize}
                onChange={(e) => setVoxelSize(e.target.value)}
                disabled={!selectedModel || status === 'loading' || voxelizeState === 'voxelizing'}
                style={{ marginLeft: '8px', width: '80px' }}
              />
            </label>
            <button
              onClick={handleVoxelize}
              disabled={!selectedModel || status === 'loading' || voxelizeState === 'voxelizing'}
              className="voxelize-button"
            >
              {voxelizeState === 'voxelizing' ? 'Voxelizing...' : 'Voxelize Current Model'}
            </button>
          </div>
          {voxelizeMessage && (
            <p className={voxelizeState === 'error' ? 'error-message' : 'success-message'}>
              {voxelizeMessage}
            </p>
          )}
        </div>
        <div className="download-section">
          <button
            onClick={handleDownloadCSV}
            disabled={!projectName.trim() || status === 'loading'}
            className="download-button"
          >
            Download CSV
          </button>
        </div>
      </section>
      <Footer modelsCount={models.length} selectedModel={selectedModel} />
    </div>
  )
}

export default App
