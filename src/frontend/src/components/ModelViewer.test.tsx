import React from 'react';
import { render, act } from '@testing-library/react';
import { ModelViewer } from './ModelViewer';
import type { LayerEditorHandle } from './LayerEditor';

const mockSceneSetup = {
  scene: { add: jest.fn() },
  camera: { aspect: 1, updateProjectionMatrix: jest.fn() },
  renderer: {
    domElement: document.createElement('div'),
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    render: jest.fn(),
  },
  controls: { update: jest.fn(), dispose: jest.fn() },
  grid: {},
};

jest.mock('../utils/threeUtils', () => ({
  createScene: jest.fn(() => mockSceneSetup),
  setupCameraForGeometry: jest.fn(),
  setupCameraForVoxels: jest.fn(),
  createModelMaterial: jest.fn(() => ({ color: { getHex: () => 0 } })),
  renderVoxelInstanced: jest.fn(() => ({ mesh: {}, instanceIdMap: new Map() })),
  disposeScene: jest.fn(),
}));

describe('ModelViewer', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ModelViewer
        selectedModel={null}
        voxelCoordinates={[]}
        onStatusChange={jest.fn()}
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders status area and viewer container', () => {
    const { container } = render(
      <ModelViewer
        selectedModel={null}
        voxelCoordinates={[]}
        onStatusChange={jest.fn()}
      />
    );
    const viewerContainer = container.querySelector('.viewer-container') || container.querySelector('[class*="viewer"]') || container.firstChild;
    expect(viewerContainer).toBeTruthy();
  });

  it('accepts projectName and selectedPartition props', () => {
    const { container } = render(
      <ModelViewer
        selectedModel={null}
        voxelCoordinates={[]}
        onStatusChange={jest.fn()}
        projectName="myproj"
        selectedPartition="default"
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('accepts isLayerEditingMode and layerAxis', () => {
    const { container } = render(
      <ModelViewer
        selectedModel={null}
        voxelCoordinates={[]}
        onStatusChange={jest.fn()}
        isLayerEditingMode={false}
        layerAxis="z"
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('calls onStatusChange loading then ready when selectedModel loads', async () => {
    const onStatusChange = jest.fn();
    render(
      <ModelViewer
        selectedModel="test.stl"
        voxelCoordinates={[]}
        onStatusChange={onStatusChange}
      />
    );
    await act(async () => {});
    expect(onStatusChange).toHaveBeenCalledWith('loading');
    expect(onStatusChange).toHaveBeenCalledWith('ready');
  });

  it('ref getSelectionProperties returns null when no selection', async () => {
    const ref = React.createRef<LayerEditorHandle>();
    render(
      <ModelViewer
        ref={ref}
        selectedModel={null}
        voxelCoordinates={[]}
        onStatusChange={jest.fn()}
      />
    );
    await act(async () => {});
    expect(ref.current).toBeTruthy();
    expect(ref.current!.getSelectionProperties()).toBeNull();
  });

  it('ref applyPaste resolves when layer editor not mounted', async () => {
    const ref = React.createRef<LayerEditorHandle>();
    render(
      <ModelViewer
        ref={ref}
        selectedModel={null}
        voxelCoordinates={[]}
        onStatusChange={jest.fn()}
      />
    );
    await act(async () => {});
    await expect(ref.current!.applyPaste({
      material: 1,
      magnetization: 0,
      polarAngle: 0,
      azimuthAngle: 0,
    })).resolves.toBeUndefined();
  });

  it('uses isLayerEditorOpen from prop when provided', () => {
    const { container } = render(
      <ModelViewer
        selectedModel={null}
        voxelCoordinates={[]}
        onStatusChange={jest.fn()}
        isLayerEditorOpen={true}
        onLayerEditorOpenChange={jest.fn()}
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('calls renderVoxelInstanced when selectedModel loads with voxelCoordinates', async () => {
    const threeUtils = require('../utils/threeUtils');
    render(
      <ModelViewer
        selectedModel="test.stl"
        voxelCoordinates={[[0, 0, 0], [1, 0, 0]]}
        onStatusChange={jest.fn()}
      />
    );
    await act(async () => {});
    expect(threeUtils.renderVoxelInstanced).toHaveBeenCalled();
  });

  it('Partitions tab click toggles panel and closes layer editor when opening', async () => {
    const onLayerEditorOpenChange = jest.fn();
    const { getByTitle } = render(
      <ModelViewer
        selectedModel={null}
        voxelCoordinates={[]}
        onStatusChange={jest.fn()}
        isLayerEditorOpen={true}
        onLayerEditorOpenChange={onLayerEditorOpenChange}
      />
    );
    await act(async () => {});
    const partitionsBtn = getByTitle('Open Partitions');
    await act(async () => {
      partitionsBtn.click();
    });
    expect(onLayerEditorOpenChange).toHaveBeenCalledWith(false);
  });

  it('Layer Editor tab click toggles open state', async () => {
    const onLayerEditorOpenChange = jest.fn();
    const { getByTitle } = render(
      <ModelViewer
        selectedModel={null}
        voxelCoordinates={[]}
        onStatusChange={jest.fn()}
        isLayerEditorOpen={false}
        onLayerEditorOpenChange={onLayerEditorOpenChange}
      />
    );
    await act(async () => {});
    const layerEditorBtn = getByTitle('Open Layer Editor');
    await act(async () => {
      layerEditorBtn.click();
    });
    expect(onLayerEditorOpenChange).toHaveBeenCalledWith(true);
  });

  it('unmount calls disposeScene', async () => {
    const threeUtils = require('../utils/threeUtils');
    const { unmount } = render(
      <ModelViewer selectedModel={null} voxelCoordinates={[]} onStatusChange={jest.fn()} />
    );
    await act(async () => {});
    unmount();
    await act(async () => {});
    expect(threeUtils.disposeScene).toHaveBeenCalled();
  });
});
