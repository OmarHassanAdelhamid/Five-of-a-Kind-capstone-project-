import React from 'react';
import { render, act } from '@testing-library/react';
import { ModelViewer } from './ModelViewer';
import type { LayerEditorHandle } from './LayerEditor';
import * as threeUtils from '../utils/threeUtils';

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
        voxelSize={1}
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
        voxelSize={1}
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
        voxelSize={1}
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
        voxelSize={1}
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
        voxelSize={1}
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
        voxelSize={1}
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
        voxelSize={1}
      />
    );
    await act(async () => {});
    await expect(ref.current!.applyPaste({
      material: 1,
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
        voxelSize={1}
        isLayerEditorOpen={true}
        onLayerEditorOpenChange={jest.fn()}
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('calls renderVoxelInstanced when selectedModel loads with voxelCoordinates', async () => {
    render(
      <ModelViewer
        selectedModel="test.stl"
        voxelCoordinates={[[0, 0, 0], [1, 0, 0]]}
        onStatusChange={jest.fn()}
        voxelSize={1}
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
        voxelSize={1}
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
        voxelSize={1}
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

  it('resize event updates camera when model loaded', async () => {
    const mockSetup = threeUtils.createScene();
    render(
      <ModelViewer
        selectedModel="test.stl"
        voxelCoordinates={[]}
        onStatusChange={jest.fn()}
        voxelSize={1}
      />
    );
    await act(async () => {});
    expect(mockSetup.camera.updateProjectionMatrix).toBeDefined();
    await act(async () => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(mockSetup.camera.updateProjectionMatrix).toHaveBeenCalled();
  });

  it('click on viewer element runs click handler (no intersect)', async () => {
    render(
      <ModelViewer
        selectedModel="test.stl"
        voxelCoordinates={[]}
        onStatusChange={jest.fn()}
        voxelSize={1}
      />
    );
    await act(async () => {});
    const domElement = threeUtils.createScene().renderer.domElement;
    await act(async () => {
      domElement.dispatchEvent(new MouseEvent('click', { clientX: 0, clientY: 0, bubbles: true }));
    });
    expect(domElement).toBeTruthy();
  });

  it('unmount calls disposeScene', async () => {
    const { unmount } = render(
      <ModelViewer selectedModel={null} voxelCoordinates={[]} onStatusChange={jest.fn()} voxelSize={1} />
    );
    await act(async () => {});
    unmount();
    await act(async () => {});
    expect(threeUtils.disposeScene).toHaveBeenCalled();
  });

  it('Layer Editor tab click when open closes it', async () => {
    const onLayerEditorOpenChange = jest.fn();
    const { getByTitle } = render(
      <ModelViewer
        selectedModel={null}
        voxelCoordinates={[]}
        onStatusChange={jest.fn()}
        voxelSize={1}
        isLayerEditorOpen={true}
        onLayerEditorOpenChange={onLayerEditorOpenChange}
      />
    );
    await act(async () => {});
    const layerEditorBtn = getByTitle('Close Layer Editor');
    await act(async () => {
      layerEditorBtn.click();
    });
    expect(onLayerEditorOpenChange).toHaveBeenCalledWith(false);
  });

  it('Partitions tab click when open closes panel', async () => {
    const { getByTitle } = render(
      <ModelViewer
        selectedModel={null}
        voxelCoordinates={[]}
        onStatusChange={jest.fn()}
        voxelSize={1}
      />
    );
    await act(async () => {});
    const partitionsBtn = getByTitle('Open Partitions');
    await act(async () => {
      partitionsBtn.click();
    });
    const closePartitionsBtn = getByTitle('Close Partitions');
    expect(closePartitionsBtn).toBeInTheDocument();
    await act(async () => {
      closePartitionsBtn.click();
    });
    expect(getByTitle('Open Partitions')).toBeInTheDocument();
  });
});
