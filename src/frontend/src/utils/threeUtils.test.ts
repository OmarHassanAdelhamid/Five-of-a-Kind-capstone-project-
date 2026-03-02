import * as THREE from 'three';
import {
  calculateVoxelSize,
  calculateCenterOffset,
  createModelMaterial,
  setupCameraForGeometry,
  setupCameraForVoxels,
  renderVoxelInstanced,
  createScene,
  disposeScene,
} from './threeUtils';

describe('threeUtils', () => {
  describe('calculateVoxelSize', () => {
    it('uses modelSize when provided', () => {
      const result = calculateVoxelSize([[0, 0, 0], [1, 1, 1]], 10);
      expect(result).toBeGreaterThanOrEqual(10 * 0.005);
      expect(result).toBeLessThanOrEqual(10 * 0.05);
    });

    it('returns 0.1 for single coordinate', () => {
      expect(calculateVoxelSize([[0, 0, 0]])).toBe(0.1);
    });

    it('computes from spacing for two coords', () => {
      const result = calculateVoxelSize([[0, 0, 0], [0.5, 0, 0]]);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('returns 0.1 when spacing too small', () => {
      const result = calculateVoxelSize([[0, 0, 0], [0.0001, 0, 0]]);
      expect(result).toBe(0.1);
    });

    it('returns 0.1 when spacing too large', () => {
      const result = calculateVoxelSize([[0, 0, 0], [20, 0, 0]]);
      expect(result).toBe(0.1);
    });
  });

  describe('calculateCenterOffset', () => {
    it('returns negated center when provided', () => {
      const center = new THREE.Vector3(1, 2, 3);
      const result = calculateCenterOffset([[0, 0, 0]], center);
      expect(result.x).toBe(-1);
      expect(result.y).toBe(-2);
      expect(result.z).toBe(-3);
    });

    it('computes center from coordinates', () => {
      const result = calculateCenterOffset([[1, 2, 3], [3, 4, 5]]);
      // With mocked THREE, Box3.getCenter returns (0.5, 0.5, 0.5); negated = (-0.5, -0.5, -0.5)
      expect(result.x).toBe(-0.5);
      expect(result.y).toBe(-0.5);
      expect(result.z).toBe(-0.5);
    });
  });

  describe('createModelMaterial', () => {
    it('returns MeshStandardMaterial', () => {
      const mat = createModelMaterial();
      expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(mat.color.getHex()).toBe(0x93c5fd);
    });
  });

  describe('setupCameraForGeometry', () => {
    it('sets camera and controls from geometry bounding sphere', () => {
      const camera = { position: { set: jest.fn() }, near: 0.1, far: 100, updateProjectionMatrix: jest.fn() } as unknown as THREE.PerspectiveCamera;
      const controls = { target: { set: jest.fn() }, minDistance: 1, maxDistance: 10, update: jest.fn() };
      const geometry = {
        computeBoundingSphere: jest.fn(),
        boundingSphere: { radius: 2 },
      };
      const grid = { scale: { setScalar: jest.fn() }, position: { y: 0 } };
      setupCameraForGeometry(camera, controls as any, geometry as any, grid as any);
      expect(geometry.computeBoundingSphere).toHaveBeenCalled();
      expect(camera.position.set).toHaveBeenCalled();
      expect(grid.scale.setScalar).toHaveBeenCalled();
    });
  });

  describe('setupCameraForVoxels', () => {
    it('sets camera and controls from voxel coordinates', () => {
      const camera = { position: { set: jest.fn() }, near: 0.1, far: 100, updateProjectionMatrix: jest.fn() } as unknown as THREE.PerspectiveCamera;
      const controls = { target: { set: jest.fn() }, minDistance: 1, maxDistance: 10, update: jest.fn() };
      const grid = { scale: { setScalar: jest.fn() }, position: { y: 0 } };
      setupCameraForVoxels(camera, controls as any, [[0, 0, 0], [1, 1, 1]], grid as any);
      expect(camera.position.set).toHaveBeenCalled();
      expect(controls.update).toHaveBeenCalled();
    });
  });

  describe('renderVoxelInstanced', () => {
    it('returns mesh and instanceIdMap for empty coordinates', () => {
      const scene = { add: jest.fn(), remove: jest.fn(), traverse: jest.fn() };
      const result = renderVoxelInstanced(scene as any, []);
      expect(result.mesh).toBeDefined();
      expect(result.instanceIdMap).toBeInstanceOf(Map);
      expect(result.instanceIdMap.size).toBe(0);
    });

    it('returns mesh and instanceIdMap for non-empty coordinates', () => {
      const scene = { add: jest.fn(), remove: jest.fn(), traverse: jest.fn() };
      const result = renderVoxelInstanced(scene as any, [[0, 0, 0], [1, 0, 0]]);
      expect(result.mesh).toBeDefined();
      expect(result.instanceIdMap.size).toBe(2);
      expect(scene.add).toHaveBeenCalledWith(result.mesh);
    });

    it('disposes existingMesh when provided', () => {
      const scene = { add: jest.fn(), remove: jest.fn() };
      const existingGeo = { dispose: jest.fn() };
      const existingMat = new (THREE as any).Material();
      existingMat.dispose = jest.fn();
      const existingMesh = {
        geometry: existingGeo,
        material: existingMat,
      };
      renderVoxelInstanced(scene as any, [[0, 0, 0]], null, existingMesh as any);
      expect(scene.remove).toHaveBeenCalledWith(existingMesh);
      expect(existingGeo.dispose).toHaveBeenCalled();
      expect(existingMat.dispose).toHaveBeenCalled();
    });
  });

  describe('createScene', () => {
    it('returns scene, camera, renderer, controls, grid', () => {
      const result = createScene(800, 600);
      expect(result.scene).toBeDefined();
      expect(result.camera).toBeDefined();
      expect(result.renderer).toBeDefined();
      expect(result.controls).toBeDefined();
      expect(result.grid).toBeDefined();
    });
  });

  describe('disposeScene', () => {
    it('disposes single mesh and controls/renderer', () => {
      const mesh = {
        geometry: { dispose: jest.fn() },
        material: Object.assign({ dispose: jest.fn() }, new (THREE as any).Material()),
      };
      const scene = { remove: jest.fn(), traverse: jest.fn((cb: (o: unknown) => void) => cb(mesh)) };
      const renderer = { dispose: jest.fn() };
      const controls = { dispose: jest.fn() };
      disposeScene(
        scene as any,
        renderer as any,
        controls as any,
        mesh as any,
      );
      expect(scene.remove).toHaveBeenCalledWith(mesh);
      expect(mesh.geometry.dispose).toHaveBeenCalled();
      expect(controls.dispose).toHaveBeenCalled();
      expect(renderer.dispose).toHaveBeenCalled();
    });

    it('handles array of objects to dispose', () => {
      const mesh1 = { geometry: { dispose: jest.fn() }, material: { dispose: jest.fn() } };
      const scene = { remove: jest.fn(), traverse: jest.fn() };
      const renderer = { dispose: jest.fn() };
      const controls = { dispose: jest.fn() };
      disposeScene(scene as any, renderer as any, controls as any, [mesh1 as any]);
      expect(scene.remove).toHaveBeenCalledWith(mesh1);
    });

    it('handles null objectsToDispose', () => {
      const scene = { remove: jest.fn(), traverse: jest.fn() };
      const renderer = { dispose: jest.fn() };
      const controls = { dispose: jest.fn() };
      disposeScene(scene as any, renderer as any, controls as any, null);
      expect(controls.dispose).toHaveBeenCalled();
      expect(renderer.dispose).toHaveBeenCalled();
    });

    it('disposes mesh with array material', () => {
      const mesh = {
        geometry: { dispose: jest.fn() },
        material: [{ dispose: jest.fn() }, { dispose: jest.fn() }],
        isMesh: true,
      };
      const scene = { remove: jest.fn(), traverse: jest.fn((cb: (o: unknown) => void) => cb(mesh)) };
      const renderer = { dispose: jest.fn() };
      const controls = { dispose: jest.fn() };
      disposeScene(scene as any, renderer as any, controls as any, mesh as any);
      expect(mesh.material[0].dispose).toHaveBeenCalled();
      expect(mesh.material[1].dispose).toHaveBeenCalled();
    });
  });
});
