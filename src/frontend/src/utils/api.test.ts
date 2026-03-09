import * as api from './api';

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('api', () => {
  it('fetchAvailableModels returns filtered .stl list', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ['a.stl', 'b.txt', 'c.stl'],
    });
    const result = await api.fetchAvailableModels();
    expect(result).toEqual(['a.stl', 'c.stl']);
  });

  it('fetchAvailableModels throws on non-ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    await expect(api.fetchAvailableModels()).rejects.toThrow('Failed to fetch models');
  });

  it('fetchAvailableProjects returns projects', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ projects: ['p1', 'p2'] }),
    });
    const result = await api.fetchAvailableProjects();
    expect(result).toEqual(['p1', 'p2']);
  });

  it('fetchPartitions returns partitions', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ partitions: ['default'] }),
    });
    const result = await api.fetchPartitions('myproj');
    expect(result).toEqual(['default']);
  });

  it('fetchPartitions returns [] and does not throw on non-ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Server error' }),
    });
    const result = await api.fetchPartitions('myproj');
    expect(result).toEqual([]);
  });

  it('fetchVoxelized returns coordinates', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ coordinates: [[0, 0, 0]] }),
    });
    const result = await api.fetchVoxelized('proj', 'default');
    expect(result).toEqual([[0, 0, 0]]);
  });

  it('fetchVoxelized throws when partition empty', async () => {
    await expect(api.fetchVoxelized('p', '')).rejects.toThrow('Partition name is required');
  });

  it('fetchVoxelized throws with detail when response not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Project not found' }),
    });
    await expect(api.fetchVoxelized('p', 'part')).rejects.toThrow('Project not found');
  });

  it('fetchVoxelized throws with status when response not ok and no detail', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    await expect(api.fetchVoxelized('p', 'part')).rejects.toThrow('Failed to fetch voxelized data (500)');
  });

  it('fetchVoxelized returns empty array when response has no coordinates', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    const result = await api.fetchVoxelized('p', 'part');
    expect(result).toEqual([]);
  });

  it('uploadSTLFile returns message on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Uploaded' }),
    });
    const file = new File(['x'], 'a.stl', { type: 'application/octet-stream' });
    const result = await api.uploadSTLFile(file);
    expect(result.message).toBe('Uploaded');
  });

  it('voxelizeModel returns message on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'OK' }),
    });
    const result = await api.voxelizeModel({
      stlFilename: 'x.stl',
      voxelSize: 0.1,
      projectName: 'proj',
      modelUnits: 'mm',
      voxelUnits: 'mm',
      defaultMaterial: 'material1',
    });
    expect(result.message).toBe('OK');
  });

  it('fetchLayers returns layers', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        project_name: 'p',
        num_layers: 1,
        layers: [{ index: 0, coordinate: 0 }],
      }),
    });
    const result = await api.fetchLayers('p', 'part', 'z');
    expect(result.num_layers).toBe(1);
  });

  it('fetchLayers throws when partition empty', async () => {
    await expect(api.fetchLayers('p', '')).rejects.toThrow('Partition name is required');
  });

  it('updateVoxels sends POST', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'OK', project_name: 'p', num_voxels: 0 }),
    });
    await api.updateVoxels({
      project_name: 'p',
      partition_name: 'part',
      voxels: [[0, 0, 0]],
      action: 'update',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('updateVoxels throws when partition_name empty', async () => {
    await expect(
      api.updateVoxels({
        project_name: 'p',
        partition_name: '',
        voxels: [],
        action: 'update',
      })
    ).rejects.toThrow('Partition name is required');
  });

  it('updateVoxels throws with detail when response not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Invalid voxels' }),
    });
    await expect(
      api.updateVoxels({
        project_name: 'p',
        partition_name: 'part',
        voxels: [[0, 0, 0]],
        action: 'update',
      })
    ).rejects.toThrow('Invalid voxels');
  });

  it('downloadVoxelCSV returns blob', async () => {
    const blob = new Blob(['csv,data'], { type: 'text/csv' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    });
    const result = await api.downloadVoxelCSV('proj', 'export');
    expect(result).toBeInstanceOf(Blob);
    expect(result.size).toBeGreaterThanOrEqual(0);
  });

  it('downloadVoxelCSV throws on non-ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Not found' }),
    });
    await expect(api.downloadVoxelCSV('p', 'e')).rejects.toThrow();
  });

  it('updateHistory undo returns response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'OK', undo_empty: 'false', redo_empty: 'false' }),
    });
    const result = await api.updateHistory({
      project_name: 'p',
      partition_name: 'part',
      action: 'undo',
    });
    expect(result.message).toBe('OK');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST', body: expect.any(String) })
    );
  });

  it('updateHistory redo returns response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'OK', undo_empty: 'false', redo_empty: 'false' }),
    });
    const result = await api.updateHistory({
      project_name: 'p',
      partition_name: 'part',
      action: 'redo',
    });
    expect(result.message).toBe('OK');
  });

  it('fetchAvailableProjects returns empty array on non-ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    const result = await api.fetchAvailableProjects();
    expect(result).toEqual([]);
  });

  it('fetchPartitions returns empty array on non-ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
    const result = await api.fetchPartitions('p');
    expect(result).toEqual([]);
  });

  it('uploadSTLFile throws on non-ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 400 });
    const file = new File(['x'], 'a.stl', { type: 'application/octet-stream' });
    await expect(api.uploadSTLFile(file)).rejects.toThrow();
  });

  it('uploadSTLFile throws with message when response not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'File too large' }),
    });
    const file = new File(['x'], 'a.stl', { type: 'application/octet-stream' });
    await expect(api.uploadSTLFile(file)).rejects.toThrow('File too large');
  });

  it('voxelizeModel throws on non-ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    await expect(
      api.voxelizeModel({
        stlFilename: 'x.stl',
        voxelSize: 0.1,
        projectName: 'proj',
        modelUnits: 'mm',
        voxelUnits: 'mm',
        defaultMaterial: 'material1',
      })
    ).rejects.toThrow();
  });

  it('voxelizeModel throws with detail when response not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Invalid voxel size' }),
    });
    await expect(
      api.voxelizeModel({
        stlFilename: 'x.stl',
        voxelSize: 0.1,
        projectName: 'proj',
        modelUnits: 'mm',
        voxelUnits: 'mm',
        defaultMaterial: 'material1',
      })
    ).rejects.toThrow('Invalid voxel size');
  });

  it('voxelizeModel throws with message when response not ok and no detail', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Validation failed' }),
    });
    await expect(
      api.voxelizeModel({
        stlFilename: 'x.stl',
        voxelSize: 0.1,
        projectName: 'proj',
        modelUnits: 'mm',
        voxelUnits: 'mm',
        defaultMaterial: 'material1',
      })
    ).rejects.toThrow('Validation failed');
  });

  it('fetchLayers throws with detail message on non-ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Project not found' }),
    });
    await expect(api.fetchLayers('p', 'part', 'z')).rejects.toThrow('Project not found');
  });

  it('updateHistory throws on non-ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Server error' }),
    });
    await expect(
      api.updateHistory({ project_name: 'p', partition_name: 'part', action: 'undo' })
    ).rejects.toThrow();
  });

  it('fetchPartitions returns empty array on reject', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    const result = await api.fetchPartitions('p');
    expect(result).toEqual([]);
  });

  it('fetchLayer returns layer data', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project_name: 'p',
          num_layers: 1,
          layers: [{ index: 0, coordinate: 0 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project_name: 'p',
          layer_index: 0,
          num_voxels: 1,
          voxels: [[0, 0, 0, 0, 0, 0, 1, 0, 0, 0]],
          axis: 'z',
        }),
      });
    const result = await api.fetchLayer('p', 'part', 0, 'z');
    expect(result.project_name).toBe('p');
    expect(result.num_voxels).toBe(1);
    expect(result.voxels).toHaveLength(1);
  });

  it('fetchLayer throws when partition empty', async () => {
    await expect(api.fetchLayer('p', '', 0)).rejects.toThrow('Partition name is required');
  });

  it('fetchLayer throws when response not ok', async () => {
    api.clearLayerCache();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project_name: 'p',
          num_layers: 1,
          layers: [{ index: 0, coordinate: 0 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Layer not found' }),
      });
    await expect(api.fetchLayer('p', 'part', 0, 'z')).rejects.toThrow('Layer not found');
  });

  it('fetchLayer throws when no layers available', async () => {
    api.clearLayerCache();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        project_name: 'p',
        num_layers: 0,
        layers: [],
      }),
    });
    await expect(api.fetchLayer('p', 'part', 0, 'z')).rejects.toThrow('No layers available');
  });

  it('fetchLayer with axis x transforms voxels correctly', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project_name: 'p',
          num_layers: 1,
          layers: [{ index: 0, coordinate: 0 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project_name: 'p',
          layer_index: 0,
          num_voxels: 1,
          voxels: [[0, 0, 0, 0, 0, 0, 1, 0, 0, 0]],
          axis: 'x',
        }),
      });
    const result = await api.fetchLayer('p', 'part', 0, 'x');
    expect(result.axis).toBe('x');
    expect(result.voxels[0].grid_x).toBeDefined();
    expect(result.voxels[0].grid_y).toBeDefined();
  });

  it('fetchLayer with axis y transforms voxels correctly', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project_name: 'p',
          num_layers: 1,
          layers: [{ index: 0, coordinate: 0 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project_name: 'p',
          layer_index: 0,
          num_voxels: 1,
          voxels: [[0, 0, 0, 0, 0, 0, 1, 0, 0, 0]],
          axis: 'y',
        }),
      });
    const result = await api.fetchLayer('p', 'part', 0, 'y');
    expect(result.axis).toBe('y');
    expect(result.voxels[0].grid_x).toBeDefined();
    expect(result.voxels[0].grid_y).toBeDefined();
  });

  it('fetchLayer findClosestLayerIndex picks closest layer by coordinate', async () => {
    api.clearLayerCache();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project_name: 'p',
          num_layers: 3,
          layers: [
            { index: 0, coordinate: 0 },
            { index: 1, coordinate: 0.1 },
            { index: 2, coordinate: 0.2 },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project_name: 'p',
          layer_index: 1,
          num_voxels: 0,
          voxels: [],
          axis: 'z',
        }),
      });
    const result = await api.fetchLayer('p', 'part', 0.09, 'z');
    expect(result.layer_index).toBe(1);
  });

  it('fetchLayer throws with detail when retrieve response not ok', async () => {
    api.clearLayerCache();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project_name: 'p',
          num_layers: 1,
          layers: [{ index: 0, coordinate: 0 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Layer not found' }),
      });
    await expect(api.fetchLayer('p', 'part', 0, 'z')).rejects.toThrow('Layer not found');
  });

  it('clearLayerCache clears cache', () => {
    expect(() => api.clearLayerCache()).not.toThrow();
  });
});
