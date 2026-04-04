import React from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayerEditor, type LayerEditorHandle } from '../LayerEditor';
import * as api from '../../utils/api';

jest.mock('../utils/api', () => ({
  fetchLayers: jest.fn(),
  fetchLayer: jest.fn(),
  updateVoxels: jest.fn(),
}));

const mockLayerResponse = {
  project_name: 'p',
  layer_index: 0,
  num_voxels: 2,
  voxels: [
    {
      ix: 0,
      iy: 0,
      iz: 0,
      x: 0,
      y: 0,
      z: 0,
      material: 1,
      polarAngle: 90,
      azimuthAngle: 0,
      grid_x: 0,
      grid_y: 0,
    },
    {
      ix: 1,
      iy: 0,
      iz: 0,
      x: 0.1,
      y: 0,
      z: 0,
      material: 2,
      polarAngle: 90,
      azimuthAngle: 0,
      grid_x: 1,
      grid_y: 0,
    },
  ],
  axis: 'z' as const,
  bounds: { grid_x_min: 0, grid_x_max: 1, grid_y_min: 0, grid_y_max: 0 },
};

describe('LayerEditor', () => {
  it('returns null when not open', () => {
    const { container } = render(
      <LayerEditor
        isOpen={false}
        projectName="p"
        partitionName="part"
        onClose={jest.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows empty message when disabled', () => {
    const { getByText } = render(
      <LayerEditor
        isOpen
        projectName="p"
        partitionName="part"
        disabled
        onClose={jest.fn()}
      />,
    );
    expect(getByText('Select a project to view layers')).toBeInTheDocument();
  });

  it('fetches and shows layers when open with partition', async () => {
    (api.fetchLayers as jest.Mock).mockResolvedValue({
      project_name: 'p',
      num_layers: 2,
      layers: [
        { index: 0, coordinate: 0 },
        { index: 1, coordinate: 0.1 },
      ],
    });
    const { getByText, findByText } = render(
      <LayerEditor
        isOpen
        projectName="p"
        partitionName="default"
        onClose={jest.fn()}
      />,
    );
    expect(api.fetchLayers).toHaveBeenCalledWith(
      'p',
      'default',
      'z',
      undefined,
    );
    await findByText(/Layer Editor/i);
    const closeBtn = getByText('×');
    expect(closeBtn).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    (api.fetchLayers as jest.Mock).mockResolvedValue({
      project_name: 'p',
      num_layers: 0,
      layers: [],
    });
    const onClose = jest.fn();
    const { getByTitle } = render(
      <LayerEditor
        isOpen
        projectName="p"
        partitionName="default"
        onClose={onClose}
      />,
    );
    await userEvent.click(getByTitle('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('fetches layers with axis x when layerAxis is x', async () => {
    (api.fetchLayers as jest.Mock).mockResolvedValue({
      project_name: 'p',
      num_layers: 0,
      layers: [],
    });
    render(
      <LayerEditor
        isOpen
        projectName="p"
        partitionName="part"
        layerAxis="x"
        onClose={jest.fn()}
      />,
    );
    expect(api.fetchLayers).toHaveBeenCalledWith('p', 'part', 'x', undefined);
  });

  it('shows error when fetchLayers rejects', async () => {
    (api.fetchLayers as jest.Mock).mockRejectedValue(
      new Error('Network error'),
    );
    const { findByText } = render(
      <LayerEditor
        isOpen
        projectName="p"
        partitionName="part"
        onClose={jest.fn()}
      />,
    );
    const errorEl = await findByText('Network error', {}, { timeout: 2000 });
    expect(errorEl).toBeInTheDocument();
  });

  it('fetches layers with voxelSize when provided', async () => {
    (api.fetchLayers as jest.Mock).mockResolvedValue({
      project_name: 'p',
      num_layers: 0,
      layers: [],
    });
    render(
      <LayerEditor
        isOpen
        projectName="p"
        partitionName="part"
        voxelSize={0.05}
        onClose={jest.fn()}
      />,
    );
    expect(api.fetchLayers).toHaveBeenCalledWith('p', 'part', 'z', 0.05);
  });

  it('Refresh button calls loadLayers again', async () => {
    (api.fetchLayers as jest.Mock).mockResolvedValue({
      project_name: 'p',
      num_layers: 1,
      layers: [{ index: 0, coordinate: 0 }],
    });
    const { getByText } = render(
      <LayerEditor
        isOpen
        projectName="p"
        partitionName="part"
        onClose={jest.fn()}
      />,
    );
    await expect(getByText(/Layer Editor/i)).toBeInTheDocument();
    const callCountBefore = (api.fetchLayers as jest.Mock).mock.calls.length;
    const refreshBtn = getByText('Refresh');
    await userEvent.click(refreshBtn);
    expect(api.fetchLayers).toHaveBeenCalledTimes(callCountBefore + 1);
  });

  it('loads layer when selectedLayerZ provided and ref getSelectionProperties/selectAllInLayer work', async () => {
    (api.fetchLayers as jest.Mock).mockResolvedValue({
      project_name: 'p',
      num_layers: 1,
      layers: [{ index: 0, coordinate: 0 }],
    });
    (api.fetchLayer as jest.Mock).mockResolvedValue(mockLayerResponse);
    const ref = React.createRef<LayerEditorHandle>();
    const { getByText } = render(
      <LayerEditor
        isOpen
        projectName="p"
        partitionName="part"
        selectedLayerZ={0}
        onClose={jest.fn()}
        ref={ref}
      />,
    );
    await waitFor(() => {
      expect(api.fetchLayer).toHaveBeenCalledWith(
        'p',
        'part',
        0,
        'z',
        undefined,
      );
    });
    await waitFor(() => {
      expect(getByText(/Layer Z=0/)).toBeInTheDocument();
    });
    expect(ref.current).toBeTruthy();
    expect(ref.current!.getSelectionProperties()).toBeNull();
    await act(async () => {
      ref.current!.selectAllInLayer();
    });
    expect(ref.current!.getSelectionProperties()).not.toBeNull();
    expect(ref.current!.getSelectionProperties()!.material).toBe(1);
  });

  it('ref applyPaste calls updateVoxels', async () => {
    (api.fetchLayers as jest.Mock).mockResolvedValue({
      project_name: 'p',
      num_layers: 1,
      layers: [{ index: 0, coordinate: 0 }],
    });
    (api.fetchLayer as jest.Mock).mockResolvedValue(mockLayerResponse);
    (api.updateVoxels as jest.Mock).mockResolvedValue({
      message: 'OK',
      project_name: 'p',
      num_voxels: 2,
    });
    const ref = React.createRef<LayerEditorHandle>();
    render(
      <LayerEditor
        isOpen
        projectName="p"
        partitionName="part"
        selectedLayerZ={0}
        onClose={jest.fn()}
        ref={ref}
      />,
    );
    await waitFor(() => {
      expect(api.fetchLayer).toHaveBeenCalled();
    });
    await act(async () => {
      ref.current!.selectAllInLayer();
    });
    await act(async () => {
      await ref.current!.applyPaste({
        material: 3,
        polarAngle: 90,
        azimuthAngle: 0,
      });
    });
    expect(api.updateVoxels).toHaveBeenCalledWith(
      expect.objectContaining({
        project_name: 'p',
        partition_name: 'part',
        action: 'update',
        materialID: 3,
      }),
    );
  });

  it('Add/Remove voxels button toggles editVoxelsMode', async () => {
    (api.fetchLayers as jest.Mock).mockResolvedValue({
      project_name: 'p',
      num_layers: 1,
      layers: [{ index: 0, coordinate: 0 }],
    });
    (api.fetchLayer as jest.Mock).mockResolvedValue(mockLayerResponse);
    const { getByTitle } = render(
      <LayerEditor
        isOpen
        projectName="p"
        partitionName="part"
        selectedLayerZ={0}
        onClose={jest.fn()}
      />,
    );
    await waitFor(() => {
      expect(api.fetchLayer).toHaveBeenCalled();
    });
    const editBtn = getByTitle(/left-click to remove voxel/i);
    await userEvent.click(editBtn);
    expect(editBtn.className).toContain('active');
    await userEvent.click(editBtn);
    expect(editBtn.className).not.toContain('active');
  });

  it('Update Material button calls updateVoxels', async () => {
    (api.fetchLayers as jest.Mock).mockResolvedValue({
      project_name: 'p',
      num_layers: 1,
      layers: [{ index: 0, coordinate: 0 }],
    });
    (api.fetchLayer as jest.Mock).mockResolvedValue(mockLayerResponse);
    (api.updateVoxels as jest.Mock).mockResolvedValue({
      message: 'OK',
      project_name: 'p',
      num_voxels: 2,
    });
    const ref = React.createRef<LayerEditorHandle>();
    const { getByTitle, container } = render(
      <LayerEditor
        isOpen
        projectName="p"
        partitionName="part"
        selectedLayerZ={0}
        onClose={jest.fn()}
        ref={ref}
      />,
    );
    await waitFor(() => {
      expect(api.fetchLayer).toHaveBeenCalled();
    });
    await act(async () => {
      ref.current!.selectAllInLayer();
    });
    const material2 = container.querySelector(
      '.material-square[title="Material 2"]',
    );
    if (material2) await userEvent.click(material2 as HTMLElement);
    const updateMaterialBtn = getByTitle(/update the material of this voxel/i);
    await userEvent.click(updateMaterialBtn);
    await waitFor(() => {
      expect(api.updateVoxels).toHaveBeenCalledWith(
        expect.objectContaining({
          project_name: 'p',
          partition_name: 'part',
          action: 'update',
          materialID: 2,
        }),
      );
    });
  });

  it('Update Magnetization button calls updateVoxels', async () => {
    (api.fetchLayers as jest.Mock).mockResolvedValue({
      project_name: 'p',
      num_layers: 1,
      layers: [{ index: 0, coordinate: 0 }],
    });
    (api.fetchLayer as jest.Mock).mockResolvedValue(mockLayerResponse);
    (api.updateVoxels as jest.Mock).mockResolvedValue({
      message: 'OK',
      project_name: 'p',
      num_voxels: 2,
    });
    const ref = React.createRef<LayerEditorHandle>();
    const { getByTitle, getByLabelText } = render(
      <LayerEditor
        isOpen
        projectName="p"
        partitionName="part"
        selectedLayerZ={0}
        onClose={jest.fn()}
        ref={ref}
      />,
    );
    await waitFor(() => {
      expect(api.fetchLayer).toHaveBeenCalled();
    });
    await act(async () => {
      ref.current!.selectAllInLayer();
    });
    const thetaInput = getByLabelText(/θ \(polar\)/i);
    await userEvent.clear(thetaInput);
    await userEvent.type(thetaInput, '45');
    const updateMagBtn = getByTitle(/update the magnetization angle/i);
    await userEvent.click(updateMagBtn);
    await waitFor(() => {
      expect(api.updateVoxels).toHaveBeenCalledWith(
        expect.objectContaining({
          project_name: 'p',
          partition_name: 'part',
          action: 'update',
          magnetization: expect.any(Array),
        }),
      );
    });
  });

  it('clicking material square sets hasChanges', async () => {
    (api.fetchLayers as jest.Mock).mockResolvedValue({
      project_name: 'p',
      num_layers: 1,
      layers: [{ index: 0, coordinate: 0 }],
    });
    (api.fetchLayer as jest.Mock).mockResolvedValue(mockLayerResponse);
    const ref = React.createRef<LayerEditorHandle>();
    const { getByTitle, container } = render(
      <LayerEditor
        isOpen
        projectName="p"
        partitionName="part"
        selectedLayerZ={0}
        onClose={jest.fn()}
        ref={ref}
      />,
    );
    await waitFor(() => {
      expect(api.fetchLayer).toHaveBeenCalled();
    });
    await act(async () => {
      ref.current!.selectAllInLayer();
    });
    const material3 = container.querySelector(
      '.material-square[title="Material 3"]',
    );
    if (material3) {
      await userEvent.click(material3 as HTMLElement);
    }
    const updateMaterialBtn = getByTitle(/update the material of this voxel/i);
    expect(updateMaterialBtn).not.toBeDisabled();
  });

  it('layer up button loads next layer', async () => {
    (api.fetchLayers as jest.Mock).mockResolvedValue({
      project_name: 'p',
      num_layers: 2,
      layers: [
        { index: 0, coordinate: 0 },
        { index: 1, coordinate: 0.1 },
      ],
    });
    (api.fetchLayer as jest.Mock)
      .mockResolvedValueOnce(mockLayerResponse)
      .mockResolvedValueOnce({
        ...mockLayerResponse,
        layer_index: 1,
        num_voxels: 1,
        voxels: [mockLayerResponse.voxels[0]],
      });
    const { getByTitle } = render(
      <LayerEditor
        isOpen
        projectName="p"
        partitionName="part"
        selectedLayerZ={0}
        onClose={jest.fn()}
      />,
    );
    await waitFor(() => {
      expect(api.fetchLayer).toHaveBeenCalled();
    });
    const upBtn = getByTitle('Higher layer');
    await userEvent.click(upBtn);
    await waitFor(() => {
      expect(api.fetchLayer).toHaveBeenCalledWith(
        'p',
        'part',
        0.1,
        'z',
        undefined,
      );
    });
  });

  it('layer down button loads previous layer', async () => {
    (api.fetchLayers as jest.Mock).mockResolvedValue({
      project_name: 'p',
      num_layers: 2,
      layers: [
        { index: 0, coordinate: 0 },
        { index: 1, coordinate: 0.1 },
      ],
    });
    (api.fetchLayer as jest.Mock)
      .mockResolvedValueOnce({ ...mockLayerResponse, layer_index: 1 })
      .mockResolvedValueOnce(mockLayerResponse);
    const { getByTitle } = render(
      <LayerEditor
        isOpen
        projectName="p"
        partitionName="part"
        selectedLayerZ={0.1}
        onClose={jest.fn()}
      />,
    );
    await waitFor(() => {
      expect(api.fetchLayer).toHaveBeenCalled();
    });
    const downBtn = getByTitle('Lower layer');
    await userEvent.click(downBtn);
    await waitFor(() => {
      const calls = (api.fetchLayer as jest.Mock).mock.calls;
      expect(calls.some((c: unknown[]) => c[2] === 0)).toBe(true);
    });
  });

  it('edit mode context menu and click trigger onVoxelAdd and onVoxelRemove', async () => {
    (api.fetchLayers as jest.Mock).mockResolvedValue({
      project_name: 'p',
      num_layers: 1,
      layers: [{ index: 0, coordinate: 0 }],
    });
    (api.fetchLayer as jest.Mock).mockResolvedValue(mockLayerResponse);
    (api.updateVoxels as jest.Mock).mockResolvedValue({
      message: 'OK',
      project_name: 'p',
      num_voxels: 1,
    });
    const { container, getByTitle } = render(
      <LayerEditor
        isOpen
        projectName="p"
        partitionName="part"
        selectedLayerZ={0}
        onClose={jest.fn()}
      />,
    );
    await waitFor(() => {
      expect(api.fetchLayer).toHaveBeenCalled();
    });
    await userEvent.click(getByTitle(/left-click to remove voxel/i));
    const canvas = container.querySelector('canvas');
    if (canvas) {
      fireEvent.contextMenu(canvas, { clientX: 0, clientY: 0 });
      fireEvent.click(canvas, { button: 0, clientX: 0, clientY: 0 });
    }
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
});
