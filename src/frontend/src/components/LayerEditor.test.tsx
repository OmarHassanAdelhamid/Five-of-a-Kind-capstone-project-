import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayerEditor } from './LayerEditor';
import * as api from '../utils/api';

jest.mock('../utils/api', () => ({
  fetchLayers: jest.fn(),
  fetchLayer: jest.fn(),
  updateVoxels: jest.fn(),
}));

describe('LayerEditor', () => {
  it('returns null when not open', () => {
    const { container } = render(
      <LayerEditor isOpen={false} projectName="p" partitionName="part" onClose={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows empty message when disabled', () => {
    const { getByText } = render(
      <LayerEditor isOpen projectName="p" partitionName="part" disabled onClose={jest.fn()} />
    );
    expect(getByText('Select a project to view layers')).toBeInTheDocument();
  });

  it('fetches and shows layers when open with partition', async () => {
    (api.fetchLayers as jest.Mock).mockResolvedValue({
      project_name: 'p',
      num_layers: 2,
      layers: [{ index: 0, coordinate: 0 }, { index: 1, coordinate: 0.1 }],
    });
    const { getByText, findByText } = render(
      <LayerEditor isOpen projectName="p" partitionName="default" onClose={jest.fn()} />
    );
    expect(api.fetchLayers).toHaveBeenCalledWith('p', 'default', 'z', undefined);
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
      <LayerEditor isOpen projectName="p" partitionName="default" onClose={onClose} />
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
      <LayerEditor isOpen projectName="p" partitionName="part" layerAxis="x" onClose={jest.fn()} />
    );
    expect(api.fetchLayers).toHaveBeenCalledWith('p', 'part', 'x', undefined);
  });

  it('shows error when fetchLayers rejects', async () => {
    (api.fetchLayers as jest.Mock).mockRejectedValue(new Error('Network error'));
    const { findByText } = render(
      <LayerEditor isOpen projectName="p" partitionName="part" onClose={jest.fn()} />
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
      />
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
      <LayerEditor isOpen projectName="p" partitionName="part" onClose={jest.fn()} />
    );
    await expect(getByText(/Layer Editor/i)).toBeInTheDocument();
    const callCountBefore = (api.fetchLayers as jest.Mock).mock.calls.length;
    const refreshBtn = getByText('Refresh');
    await userEvent.click(refreshBtn);
    expect(api.fetchLayers).toHaveBeenCalledTimes(callCountBefore + 1);
  });
});
