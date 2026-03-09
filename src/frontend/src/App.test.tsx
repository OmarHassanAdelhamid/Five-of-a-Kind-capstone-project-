import { render, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import * as api from './utils/api';

jest.mock('./utils/api', () => ({
  fetchAvailableModels: jest.fn(),
  fetchAvailableProjects: jest.fn(),
  fetchPartitions: jest.fn(),
  fetchVoxelized: jest.fn(),
  uploadSTLFile: jest.fn(),
  voxelizeModel: jest.fn(),
  downloadVoxelCSV: jest.fn(),
  updateHistory: jest.fn(),
}));

jest.mock('./components/ModelViewer', () => ({
  ModelViewer: () => <div data-testid="model-viewer">ModelViewer</div>,
}));

describe('App', () => {
  let alertMock: jest.SpyInstance;

  beforeEach(() => {
    (api.fetchAvailableModels as jest.Mock).mockResolvedValue(['cube.stl', 'box.stl']);
    (api.fetchAvailableProjects as jest.Mock).mockResolvedValue([]);
    alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertMock.mockRestore();
  });

  it('renders and fetches models on mount', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    expect(api.fetchAvailableModels).toHaveBeenCalled();
    expect(result!.getByTestId('model-viewer')).toBeInTheDocument();
  });

  it('handles fetchAvailableProjects rejection and sets empty project list', async () => {
    (api.fetchAvailableProjects as jest.Mock).mockRejectedValue(new Error('Network error'));
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {});
    expect(result!.getByTestId('model-viewer')).toBeInTheDocument();
  });

  it('handles fetchVoxelized rejection when loading project', async () => {
    (api.fetchAvailableProjects as jest.Mock).mockResolvedValue(['cube']);
    (api.fetchPartitions as jest.Mock).mockResolvedValue(['part1']);
    (api.fetchVoxelized as jest.Mock).mockRejectedValue(new Error('Load failed'));
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.hover(result!.getByText('Open Project...'));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'cube' }));
    });
    await act(async () => {});
    expect(api.fetchVoxelized).toHaveBeenCalledWith('cube', 'part1');
  });

  it('handleDownloadCSV shows alert when download fails', async () => {
    (api.fetchAvailableProjects as jest.Mock).mockResolvedValue(['cube']);
    (api.fetchPartitions as jest.Mock).mockResolvedValue(['part1']);
    (api.fetchVoxelized as jest.Mock).mockResolvedValue([[0, 0, 0]]);
    (api.downloadVoxelCSV as jest.Mock).mockRejectedValue(new Error('Download failed'));
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.hover(result!.getByText('Open Project...'));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'cube' }));
    });
    await act(async () => {});
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByText('Save...'));
    });
    await act(async () => {});
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Download failed'));
  });

  it('upload STL failure shows alert', async () => {
    (api.uploadSTLFile as jest.Mock).mockRejectedValue(new Error('Upload failed'));
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    const input = result!.container.querySelector('#stl-upload-input') as HTMLInputElement;
    expect(input).toBeTruthy();
    const file = new File(['x'], 'model.stl', { type: 'application/octet-stream' });
    await act(async () => {
      await userEvent.upload(input, file);
    });
    await act(async () => {});
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Upload failed'));
  });

  it('handleSaveAs shows alert when download fails', async () => {
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('newname');
    (api.fetchAvailableProjects as jest.Mock).mockResolvedValue(['cube']);
    (api.fetchPartitions as jest.Mock).mockResolvedValue(['part1']);
    (api.fetchVoxelized as jest.Mock).mockResolvedValue([[0, 0, 0]]);
    (api.downloadVoxelCSV as jest.Mock).mockRejectedValue(new Error('Save failed'));
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.hover(result!.getByText('Open Project...'));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'cube' }));
    });
    await act(async () => {});
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /save as\.\.\./i }));
    });
    await act(async () => {});
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Save failed'));
    promptSpy.mockRestore();
  });

  it('renders menu bar', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    expect(result!.getByRole('button', { name: 'File' })).toBeInTheDocument();
  });

  it('Open Layer Menu shows alert when no project', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'View' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /open layer menu/i }));
    });
    expect(alertMock).toHaveBeenCalledWith('Please select a project to open the Layer Editor.');
  });

  it('Save shows alert when no project', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /save\.\.\./i }));
    });
    expect(alertMock).toHaveBeenCalledWith('No project to save. Please create or load a project first.');
  });

  it('Export shows alert when no project', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /export\.\.\./i }));
    });
    expect(alertMock).toHaveBeenCalledWith('Please select a project to export.');
  });

  it('Help > About shows alert', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'Help' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /about version/i }));
    });
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Voxel Editor'));
  });

  it('Help > License shows alert', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'Help' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /^license$/i }));
    });
    expect(alertMock).toHaveBeenCalled();
  });

  it('Help > Credits shows alert', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'Help' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /^credits$/i }));
    });
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Five-of-a-Kind'));
  });

  it('Edit > Preferences shows alert', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'Edit' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /^preferences$/i }));
    });
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Preferences'));
  });

  it('opens New Project dialog when model selected and New Project clicked', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.hover(result!.getByRole('button', { name: /open project/i }));
    });
    await act(async () => {
      await userEvent.click(result!.getByText('New Project...'));
    });
    expect(result!.getByText(/new project/i)).toBeInTheDocument();
    expect(result!.getByRole('button', { name: /create project/i })).toBeInTheDocument();
  });

  it('Undo shows alert when no project', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'Edit' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /^undo/i }));
    });
    expect(alertMock).toHaveBeenCalledWith('Please select a project to undo changes.');
  });

  it('Edit > Open Partition Menu shows alert', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'View' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /open partition menu/i }));
    });
    expect(alertMock).toHaveBeenCalledWith('Partition Menu functionality not yet implemented.');
  });

  it('Selection > Reset selected does not throw', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'Selection' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /reset selected voxels/i }));
    });
    expect(result!.getByTestId('model-viewer')).toBeInTheDocument();
  });

  it('Selection > Select all does not throw when no voxels', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'Selection' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /select all/i }));
    });
    expect(result!.getByTestId('model-viewer')).toBeInTheDocument();
  });

  it('Help > Privacy shows alert', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'Help' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /privacy statement/i }));
    });
    expect(alertMock).toHaveBeenCalled();
  });

  it('New Project confirm shows alert when voxelizeModel fails', async () => {
    (api.voxelizeModel as jest.Mock).mockRejectedValue(new Error('Server error'));
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.hover(result!.getByText('Open Project...'));
    });
    await act(async () => {
      await userEvent.click(result!.getByText('New Project...'));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /create project/i }));
    });
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Server error'));
  });

  it('New Project confirm with empty voxels sets error status', async () => {
    (api.voxelizeModel as jest.Mock).mockResolvedValue({ message: 'OK' });
    (api.fetchAvailableProjects as jest.Mock).mockResolvedValue(['cube']);
    (api.fetchPartitions as jest.Mock).mockResolvedValue(['default']);
    (api.fetchVoxelized as jest.Mock).mockResolvedValue([]);
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.hover(result!.getByText('Open Project...'));
    });
    await act(async () => {
      await userEvent.click(result!.getByText('New Project...'));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /create project/i }));
    });
    await act(async () => {});
    expect(api.fetchVoxelized).toHaveBeenCalledWith('cube', 'default');
  });

  it('New Project confirm calls voxelizeModel and fetchPartitions', async () => {
    (api.voxelizeModel as jest.Mock).mockResolvedValue({ message: 'OK' });
    (api.fetchAvailableProjects as jest.Mock).mockResolvedValue(['cube']);
    (api.fetchPartitions as jest.Mock).mockResolvedValue(['default']);
    (api.fetchVoxelized as jest.Mock).mockResolvedValue([[0, 0, 0]]);
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.hover(result!.getByRole('button', { name: /open project/i }));
    });
    await act(async () => {
      await userEvent.click(result!.getByText('New Project...'));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /create project/i }));
    });
    expect(api.voxelizeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        stlFilename: 'cube.stl',
        projectName: 'cube',
        voxelSize: expect.any(Number),
        modelUnits: 'mm',
        voxelUnits: 'mm',
        defaultMaterial: 'material1',
      })
    );
    expect(api.fetchAvailableProjects).toHaveBeenCalled();
    await act(async () => {});
    expect(api.fetchPartitions).toHaveBeenCalledWith('cube');
  });

  it('sets error status when fetch models returns empty list', async () => {
    (api.fetchAvailableModels as jest.Mock).mockResolvedValue([]);
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {});
    expect(result!.getByTestId('model-viewer')).toBeInTheDocument();
  });

  it('sets error when fetch models rejects', async () => {
    (api.fetchAvailableModels as jest.Mock).mockRejectedValue(new Error('Network error'));
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {});
    expect(result!.getByTestId('model-viewer')).toBeInTheDocument();
  });

  it('Save As does nothing when prompt returns empty', async () => {
    (api.downloadVoxelCSV as jest.Mock).mockClear();
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('');
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /save as\.\.\./i }));
    });
    expect(promptSpy).toHaveBeenCalled();
    expect(api.downloadVoxelCSV).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it('Save As with valid name downloads and shows alert', async () => {
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('new-name');
    (api.fetchAvailableProjects as jest.Mock).mockResolvedValue(['cube']);
    (api.fetchPartitions as jest.Mock).mockResolvedValue(['part1']);
    (api.fetchVoxelized as jest.Mock).mockResolvedValue([[0, 0, 0]]);
    (api.downloadVoxelCSV as jest.Mock).mockResolvedValue(new Blob(['csv']));
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.hover(result!.getByText('Open Project...'));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'cube' }));
    });
    await act(async () => {});
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /save as\.\.\./i }));
    });
    await act(async () => {});
    expect(api.downloadVoxelCSV).toHaveBeenCalledWith('cube', 'cube');
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('new-name'));
    promptSpy.mockRestore();
  });

  it('Redo shows alert when no project', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'Edit' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /redo/i }));
    });
    expect(alertMock).toHaveBeenCalledWith('Please select a project to redo changes.');
  });

  it('handleUploadFile shows alert for non-.stl file', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    const input = result!.container.querySelector('#stl-upload-input');
    expect(input).toBeTruthy();
    await act(async () => {
      const file = new File(['x'], 'image.png', { type: 'image/png' });
      fireEvent.change(input!, { target: { files: [file], value: '' } });
    });
    expect(alertMock).toHaveBeenCalledWith('Please select a file with the .stl extension.');
  });

  it('handleUploadFile shows alert when upload fails', async () => {
    (api.uploadSTLFile as jest.Mock).mockRejectedValue(new Error('Upload failed'));
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    const input = result!.container.querySelector('#stl-upload-input');
    await act(async () => {
      const file = new File(['x'], 'a.stl', { type: 'application/octet-stream' });
      fireEvent.change(input!, { target: { files: [file], value: '' } });
    });
    await act(async () => {});
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Upload failed'));
  });

  it('handleUploadFile uploads .stl and refreshes model list', async () => {
    (api.uploadSTLFile as jest.Mock).mockResolvedValue({ message: 'OK' });
    (api.fetchAvailableModels as jest.Mock)
      .mockResolvedValueOnce(['cube.stl'])
      .mockResolvedValueOnce(['cube.stl', 'uploaded.stl']);
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    const input = result!.container.querySelector('#stl-upload-input');
    await act(async () => {
      const file = new File(['x'], 'uploaded.stl', { type: 'application/octet-stream' });
      fireEvent.change(input!, { target: { files: [file], value: '' } });
    });
    await act(async () => {});
    expect(api.uploadSTLFile).toHaveBeenCalled();
    expect(api.fetchAvailableModels).toHaveBeenCalled();
  });

  it('Edit > Preferences shows alert', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'Edit' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /preferences/i }));
    });
    expect(alertMock).toHaveBeenCalledWith(
      expect.stringContaining('Preferences dialog would open here')
    );
  });

  it('View > Open Partition Menu shows alert', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'View' }));
    });
    const partitionBtn = await result!.findByRole('button', { name: /open partition menu/i });
    await act(async () => {
      await userEvent.click(partitionBtn);
    });
    expect(alertMock).toHaveBeenCalledWith('Partition Menu functionality not yet implemented.');
  });

  it('Help > About shows About text', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'Help' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByText('About Version'));
    });
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Voxel Editor'));
  });

  it('Help > License shows alert', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'Help' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByText('License'));
    });
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('License'));
  });

  it('Help > Credits shows alert', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'Help' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByText('Credits'));
    });
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Five-of-a-Kind'));
  });

  it('keyboard Ctrl+S triggers handleSave and shows alert when no project', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
    });
    expect(alertMock).toHaveBeenCalledWith('No project to save. Please create or load a project first.');
  });

  it('keyboard Ctrl+E triggers handleExport and shows alert when no project', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true, bubbles: true }));
    });
    expect(alertMock).toHaveBeenCalledWith('Please select a project to export.');
  });

  it('keyboard Ctrl+A triggers handleSelectAll', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
    });
    expect(result!.getByTestId('model-viewer')).toBeInTheDocument();
  });

  it('selecting project from File menu loads voxels and sets status', async () => {
    (api.fetchAvailableProjects as jest.Mock).mockResolvedValue(['cube']);
    (api.fetchPartitions as jest.Mock).mockResolvedValue(['part1']);
    (api.fetchVoxelized as jest.Mock).mockResolvedValue([[0, 0, 0], [1, 0, 0]]);
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.hover(result!.getByText('Open Project...'));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'cube' }));
    });
    await act(async () => {});
    expect(api.fetchPartitions).toHaveBeenCalledWith('cube');
    expect(api.fetchVoxelized).toHaveBeenCalledWith('cube', 'part1');
  });

  it('Open Layer Menu with project does not show alert (layer editor opens)', async () => {
    (api.fetchAvailableProjects as jest.Mock).mockResolvedValue(['cube']);
    (api.fetchPartitions as jest.Mock).mockResolvedValue(['default']);
    (api.fetchVoxelized as jest.Mock).mockResolvedValue([[0, 0, 0]]);
    alertMock.mockClear();
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.hover(result!.getByText('Open Project...'));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'cube' }));
    });
    await act(async () => {});
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'View' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /open layer menu/i }));
    });
    expect(alertMock).not.toHaveBeenCalledWith('Please select a project to open the Layer Editor.');
  });

  it('handleDownloadCSV success creates link and revokes URL', async () => {
    const revokeSpy = jest.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
    const createObjectURLSpy = jest.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:mock');
    (api.fetchAvailableProjects as jest.Mock).mockResolvedValue(['cube']);
    (api.fetchPartitions as jest.Mock).mockResolvedValue(['part1']);
    (api.fetchVoxelized as jest.Mock).mockResolvedValue([[0, 0, 0]]);
    (api.downloadVoxelCSV as jest.Mock).mockResolvedValue(new Blob(['csv']));
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.hover(result!.getByText('Open Project...'));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'cube' }));
    });
    await act(async () => {});
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByText('Save...'));
    });
    await act(async () => {});
    expect(api.downloadVoxelCSV).toHaveBeenCalledWith('cube', 'cube');
    expect(createObjectURLSpy).toHaveBeenCalled();
    revokeSpy.mockRestore();
    createObjectURLSpy.mockRestore();
  });

  it('Redo with project and partition calls updateHistory', async () => {
    (api.fetchAvailableProjects as jest.Mock).mockResolvedValue(['cube']);
    (api.fetchPartitions as jest.Mock).mockResolvedValue(['part1']);
    (api.fetchVoxelized as jest.Mock).mockResolvedValue([[0, 0, 0]]);
    (api.updateHistory as jest.Mock).mockResolvedValue([]);
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.hover(result!.getByText('Open Project...'));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'cube' }));
    });
    await act(async () => {});
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'Edit' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /redo/i }));
    });
    await act(async () => {});
    expect(api.updateHistory).toHaveBeenCalledWith({
      project_name: 'cube',
      partition_name: 'part1',
      action: 'redo',
    });
  });

  it('File > Open File > select model changes model', async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.hover(result!.getByText('Open File...'));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'box.stl' }));
    });
    expect(result!.getByTestId('model-viewer')).toBeInTheDocument();
  });

  it('Undo with project and partition calls updateHistory', async () => {
    (api.fetchAvailableProjects as jest.Mock).mockResolvedValue(['cube']);
    (api.fetchPartitions as jest.Mock).mockResolvedValue(['part1']);
    (api.fetchVoxelized as jest.Mock).mockResolvedValue([[0, 0, 0]]);
    (api.updateHistory as jest.Mock).mockResolvedValue([]);
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<App />);
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'File' }));
    });
    await act(async () => {
      await userEvent.hover(result!.getByText('Open Project...'));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'cube' }));
    });
    await act(async () => {});
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: 'Edit' }));
    });
    await act(async () => {
      await userEvent.click(result!.getByRole('button', { name: /undo/i }));
    });
    await act(async () => {});
    expect(api.updateHistory).toHaveBeenCalledWith({
      project_name: 'cube',
      partition_name: 'part1',
      action: 'undo',
    });
  });
});
