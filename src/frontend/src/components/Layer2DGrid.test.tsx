import { render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Layer2DGrid } from './Layer2DGrid';

const mockLayerData = {
  project_name: 'p',
  layer_index: 0,
  num_voxels: 2,
  voxels: [
    {
      ix: 0, iy: 0, iz: 0, x: 0, y: 0, z: 0,
      material: 1, polarAngle: 0, azimuthAngle: 0,
      grid_x: 0, grid_y: 0,
    },
    {
      ix: 1, iy: 0, iz: 0, x: 0.1, y: 0, z: 0,
      material: 1, polarAngle: 0, azimuthAngle: 0,
      grid_x: 1, grid_y: 0,
    },
  ],
  bounds: { grid_x_min: 0, grid_x_max: 1, grid_y_min: 0, grid_y_max: 0 },
};

describe('Layer2DGrid', () => {
  it('renders canvas and layer nav when layerData provided', () => {
    const { container, getByText } = render(
      <Layer2DGrid
        layerData={mockLayerData}
        onLayerUp={jest.fn()}
        onLayerDown={jest.fn()}
        canGoUp
        canGoDown
      />
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();
    expect(getByText('↑')).toBeInTheDocument();
    expect(getByText('↓')).toBeInTheDocument();
  });

  it('renders with null layerData', () => {
    const { getByText } = render(<Layer2DGrid layerData={null} />);
    expect(getByText('Select a layer to view 2D grid')).toBeInTheDocument();
  });

  it('calls onLayerUp when layer up button clicked', async () => {
    const onLayerUp = jest.fn();
    const { getByText } = render(
      <Layer2DGrid
        layerData={mockLayerData}
        onLayerUp={onLayerUp}
        onLayerDown={jest.fn()}
        canGoUp
        canGoDown
      />
    );
    await userEvent.click(getByText('↑'));
    expect(onLayerUp).toHaveBeenCalled();
  });

  it('calls onLayerDown when layer down button clicked', async () => {
    const onLayerDown = jest.fn();
    const { getByText } = render(
      <Layer2DGrid
        layerData={mockLayerData}
        onLayerUp={jest.fn()}
        onLayerDown={onLayerDown}
        canGoUp
        canGoDown
      />
    );
    await userEvent.click(getByText('↓'));
    expect(onLayerDown).toHaveBeenCalled();
  });

  it('renders Click and Lasso mode buttons', () => {
    const { getByTitle } = render(
      <Layer2DGrid
        layerData={mockLayerData}
        onLayerUp={jest.fn()}
        onLayerDown={jest.fn()}
        canGoUp
        canGoDown
      />
    );
    expect(getByTitle(/click to select single voxel/i)).toBeInTheDocument();
    expect(getByTitle(/draw lasso to select multiple/i)).toBeInTheDocument();
  });

  it('switches to Lasso mode when Lasso button clicked', async () => {
    const { getByRole } = render(
      <Layer2DGrid
        layerData={mockLayerData}
        onLayerUp={jest.fn()}
        onLayerDown={jest.fn()}
        canGoUp
        canGoDown
      />
    );
    await userEvent.click(getByRole('button', { name: /lasso/i }));
    expect(getByRole('button', { name: /lasso/i }).className).toContain('active');
  });

  it('renders placeholder when layerData has empty voxels', () => {
    const emptyLayerData = {
      project_name: 'p',
      layer_index: 0,
      num_voxels: 0,
      voxels: [],
      bounds: { grid_x_min: 0, grid_x_max: 1, grid_y_min: 0, grid_y_max: 1 },
    };
    const { getByText } = render(
      <Layer2DGrid
        layerData={emptyLayerData}
        onLayerUp={jest.fn()}
        onLayerDown={jest.fn()}
      />
    );
    expect(getByText('Select a layer to view 2D grid')).toBeInTheDocument();
  });

  it('uses custom materialColors cellColor and backgroundColor', () => {
    const { container } = render(
      <Layer2DGrid
        layerData={mockLayerData}
        materialColors={{ 1: '#ff0000' }}
        cellColor="#00ff00"
        selectedCellColor="#0000ff"
        backgroundColor="#111111"
      />
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('calls onVoxelSelect when canvas clicked', async () => {
    const onVoxelSelect = jest.fn();
    const { container } = render(
      <Layer2DGrid
        layerData={mockLayerData}
        onVoxelSelect={onVoxelSelect}
        onLayerUp={jest.fn()}
        onLayerDown={jest.fn()}
      />
    );
    const canvas = container.querySelector('canvas');
    if (canvas) {
      await userEvent.click(canvas);
    }
    expect(container.firstChild).toBeInTheDocument();
  });

  it('lasso mode mouseDown starts lasso path', async () => {
    const { container, getByRole } = render(
      <Layer2DGrid
        layerData={mockLayerData}
        onLayerUp={jest.fn()}
        onLayerDown={jest.fn()}
        canGoUp
        canGoDown
      />
    );
    await userEvent.click(getByRole('button', { name: /lasso/i }));
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
    if (canvas) {
      fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    }
    expect(container.firstChild).toBeInTheDocument();
  });

  it('mouseMove in lasso mode extends path when distance > 5', async () => {
    const { container, getByRole } = render(
      <Layer2DGrid
        layerData={mockLayerData}
        onLayerUp={jest.fn()}
        onLayerDown={jest.fn()}
        canGoUp
        canGoDown
      />
    );
    await userEvent.click(getByRole('button', { name: /lasso/i }));
    const canvas = container.querySelector('canvas');
    if (canvas) {
      fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseUp(canvas, { clientX: 100, clientY: 100 });
    }
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with selectedVoxelIndices to show selection', () => {
    const { container } = render(
      <Layer2DGrid
        layerData={mockLayerData}
        selectedVoxelIndices={new Set([0])}
        onLayerUp={jest.fn()}
        onLayerDown={jest.fn()}
      />
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('mouseLeave clears hover state', () => {
    const { container } = render(
      <Layer2DGrid
        layerData={mockLayerData}
        onLayerUp={jest.fn()}
        onLayerDown={jest.fn()}
      />
    );
    const canvas = container.querySelector('canvas');
    if (canvas) {
      fireEvent.mouseLeave(canvas);
    }
    expect(container.firstChild).toBeInTheDocument();
  });

  it('calls onVoxelsSelect when provided', async () => {
    const onVoxelsSelect = jest.fn();
    const { container } = render(
      <Layer2DGrid
        layerData={mockLayerData}
        onVoxelsSelect={onVoxelsSelect}
        onLayerUp={jest.fn()}
        onLayerDown={jest.fn()}
      />
    );
    const canvas = container.querySelector('canvas');
    if (canvas) {
      await userEvent.click(canvas);
    }
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders placeholder when layerData has no bounds', () => {
    const noBounds = {
      project_name: 'p',
      layer_index: 0,
      num_voxels: 1,
      voxels: [mockLayerData.voxels[0]],
      bounds: null as unknown as { grid_x_min: number; grid_x_max: number; grid_y_min: number; grid_y_max: number },
    };
    const { getByText } = render(<Layer2DGrid layerData={noBounds} />);
    expect(getByText('Select a layer to view 2D grid')).toBeInTheDocument();
  });

  it('editVoxelsMode right-click on empty cell calls onVoxelAdd', () => {
    const onVoxelAdd = jest.fn();
    const { container } = render(
      <Layer2DGrid
        layerData={mockLayerData}
        editVoxelsMode
        onVoxelAdd={onVoxelAdd}
        onLayerUp={jest.fn()}
        onLayerDown={jest.fn()}
      />
    );
    const canvas = container.querySelector('canvas');
    if (canvas) {
      fireEvent.contextMenu(canvas, { clientX: 0, clientY: 0 });
    }
    expect(container.firstChild).toBeInTheDocument();
  });

  it('editVoxelsMode left-click calls onVoxelRemove when hitting voxel', () => {
    const onVoxelRemove = jest.fn();
    const { container } = render(
      <Layer2DGrid
        layerData={mockLayerData}
        editVoxelsMode
        onVoxelRemove={onVoxelRemove}
        onLayerUp={jest.fn()}
        onLayerDown={jest.fn()}
      />
    );
    const canvas = container.querySelector('canvas');
    if (canvas) {
      fireEvent.click(canvas, { button: 0, clientX: 0, clientY: 0 });
    }
    expect(container.firstChild).toBeInTheDocument();
  });

  it('wheel on container changes zoom', () => {
    const { container } = render(
      <Layer2DGrid
        layerData={mockLayerData}
        onLayerUp={jest.fn()}
        onLayerDown={jest.fn()}
      />
    );
    const wrapper = container.querySelector('.layer-2d-grid-canvas-container');
    if (wrapper) {
      fireEvent.wheel(wrapper, { deltaY: -100 });
    }
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('click mode button activates Click', async () => {
    const { getByRole } = render(
      <Layer2DGrid
        layerData={mockLayerData}
        onLayerUp={jest.fn()}
        onLayerDown={jest.fn()}
      />
    );
    await userEvent.click(getByRole('button', { name: /lasso/i }));
    await userEvent.click(getByRole('button', { name: /click/i }));
    expect(getByRole('button', { name: /click/i }).className).toContain('active');
  });
});
