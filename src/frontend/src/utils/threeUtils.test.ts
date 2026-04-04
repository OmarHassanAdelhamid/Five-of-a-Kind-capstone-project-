import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
  calculateCenterOffset,
  createModelMaterial,
  setupCameraForGeometry,
  setupCameraForVoxels,
  renderVoxelInstanced,
  createScene,
  disposeScene,
} from './threeUtils';

describe('threeUtils', () => {
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
      const controls = { target: { set: jest.fn() }, minDistance: 1, maxDistance: 10, update: jest.fn() } as unknown as OrbitControls;
      const geometry = {
        computeBoundingSphere: jest.fn(),
        boundingSphere: { radius: 2 },
      } as unknown as THREE.BufferGeometry;
      const grid = { scale: { setScalar: jest.fn() }, position: { y: 0 } } as unknown as THREE.GridHelper;
      setupCameraForGeometry(camera, controls, geometry, grid);
      expect((geometry as unknown as { computeBoundingSphere: jest.Mock }).computeBoundingSphere).toHaveBeenCalled();
      expect(camera.position.set).toHaveBeenCalled();
      expect((grid as unknown as { scale: { setScalar: jest.Mock } }).scale.setScalar).toHaveBeenCalled();
    });
  });

  describe('setupCameraForVoxels', () => {
    it('sets camera and controls from voxel coordinates', () => {
      const camera = { position: { set: jest.fn() }, near: 0.1, far: 100, updateProjectionMatrix: jest.fn() } as unknown as THREE.PerspectiveCamera;
      const controls = { target: { set: jest.fn() }, minDistance: 1, maxDistance: 10, update: jest.fn() } as unknown as OrbitControls;
      const grid = { scale: { setScalar: jest.fn() }, position: { y: 0 } } as unknown as THREE.GridHelper;
      setupCameraForVoxels(camera, controls, [[0, 0, 0], [1, 1, 1]], grid);
      expect(camera.position.set).toHaveBeenCalled();
      expect((controls as unknown as { update: jest.Mock }).update).toHaveBeenCalled();
    });

  });

  describe('renderVoxelInstanced', () => {
    it('returns mesh and instanceIdMap for empty coordinates', () => {
      const scene = { add: jest.fn(), remove: jest.fn(), traverse: jest.fn() } as unknown as THREE.Scene;
      const result = renderVoxelInstanced(scene, [], 1);
      expect(result.mesh).toBeDefined();
      expect(result.instanceIdMap).toBeInstanceOf(Map);
      expect(result.instanceIdMap.size).toBe(0);
    });

    it('returns mesh and instanceIdMap for non-empty coordinates', () => {
      const scene = { add: jest.fn(), remove: jest.fn(), traverse: jest.fn() } as unknown as THREE.Scene;
      const result = renderVoxelInstanced(scene, [[0, 0, 0], [1, 0, 0]], 1);
      expect(result.mesh).toBeDefined();
      expect(result.instanceIdMap.size).toBe(2);
      expect((scene as unknown as { add: jest.Mock }).add).toHaveBeenCalledWith(result.mesh);
    });

    it('throws when voxelSize is invalid (0 or NaN)', () => {
      const scene = { add: jest.fn(), remove: jest.fn(), traverse: jest.fn() } as unknown as THREE.Scene;
      expect(() =>
        renderVoxelInstanced(scene, [[0, 0, 0]], 0)
      ).toThrow(/Invalid voxelSize/);
      expect(() =>
        renderVoxelInstanced(scene, [[0, 0, 0]], NaN)
      ).toThrow(/Invalid voxelSize/);
    });

    it('disposes existingMesh when provided', () => {
      const scene = { add: jest.fn(), remove: jest.fn() } as unknown as THREE.Scene;
      const existingGeo = { dispose: jest.fn() };
      const existingMat = { dispose: jest.fn() } as unknown as THREE.Material;
      const existingMesh = {
        geometry: existingGeo,
        material: existingMat,
      } as unknown as THREE.InstancedMesh;
      renderVoxelInstanced(scene, [[0, 0, 0]], 1, null, existingMesh);
      expect((scene as unknown as { remove: jest.Mock }).remove).toHaveBeenCalledWith(existingMesh);
      expect(existingGeo.dispose).toHaveBeenCalled();
      expect((existingMat as unknown as { dispose: jest.Mock }).dispose).toHaveBeenCalled();
    });

    it('throws when voxelSize is invalid (0)', () => {
      const scene = { add: jest.fn(), remove: jest.fn() } as unknown as THREE.Scene;
      expect(() => renderVoxelInstanced(scene, [[0, 0, 0]], 0)).toThrow(
        'Invalid voxelSize received from backend'
      );
    });

    it('throws when voxelSize is NaN', () => {
      const scene = { add: jest.fn(), remove: jest.fn() } as unknown as THREE.Scene;
      expect(() => renderVoxelInstanced(scene, [[0, 0, 0]], NaN)).toThrow(
        'Invalid voxelSize received from backend'
      );
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
        material: Object.assign({ dispose: jest.fn() }, { isMaterial: true }),
      } as unknown as THREE.Mesh;
      const scene = { remove: jest.fn(), traverse: jest.fn((cb: (o: unknown) => void) => cb(mesh)) } as unknown as THREE.Scene;
      const renderer = { dispose: jest.fn() } as unknown as THREE.WebGLRenderer;
      const controls = { dispose: jest.fn() } as unknown as OrbitControls;
      disposeScene(
        scene,
        renderer,
        controls,
        mesh,
      );
      expect((scene as unknown as { remove: jest.Mock }).remove).toHaveBeenCalledWith(mesh);
      expect((mesh as unknown as { geometry: { dispose: jest.Mock } }).geometry.dispose).toHaveBeenCalled();
      expect((controls as unknown as { dispose: jest.Mock }).dispose).toHaveBeenCalled();
      expect((renderer as unknown as { dispose: jest.Mock }).dispose).toHaveBeenCalled();
    });

    it('handles array of objects to dispose', () => {
      const mesh1 = { geometry: { dispose: jest.fn() }, material: { dispose: jest.fn() } } as unknown as THREE.Mesh;
      const scene = { remove: jest.fn(), traverse: jest.fn() } as unknown as THREE.Scene;
      const renderer = { dispose: jest.fn() } as unknown as THREE.WebGLRenderer;
      const controls = { dispose: jest.fn() } as unknown as OrbitControls;
      disposeScene(scene, renderer, controls, [mesh1]);
      expect((scene as unknown as { remove: jest.Mock }).remove).toHaveBeenCalledWith(mesh1);
    });

    it('handles null objectsToDispose', () => {
      const scene = { remove: jest.fn(), traverse: jest.fn() } as unknown as THREE.Scene;
      const renderer = { dispose: jest.fn() } as unknown as THREE.WebGLRenderer;
      const controls = { dispose: jest.fn() } as unknown as OrbitControls;
      disposeScene(scene, renderer, controls, null);
      expect((controls as unknown as { dispose: jest.Mock }).dispose).toHaveBeenCalled();
      expect((renderer as unknown as { dispose: jest.Mock }).dispose).toHaveBeenCalled();
    });

    it('disposes mesh with array material', () => {
      const mesh = {
        geometry: { dispose: jest.fn() },
        material: [{ dispose: jest.fn() }, { dispose: jest.fn() }],
        isMesh: true,
      } as unknown as THREE.Mesh;
      const scene = { remove: jest.fn(), traverse: jest.fn((cb: (o: unknown) => void) => cb(mesh)) } as unknown as THREE.Scene;
      const renderer = { dispose: jest.fn() } as unknown as THREE.WebGLRenderer;
      const controls = { dispose: jest.fn() } as unknown as OrbitControls;
      disposeScene(scene, renderer, controls, mesh);
      expect((mesh.material as unknown as { dispose: jest.Mock }[])[0].dispose).toHaveBeenCalled();
      expect((mesh.material as unknown as { dispose: jest.Mock }[])[1].dispose).toHaveBeenCalled();
    });

    it('traverse disposes Mesh with single material', () => {
      const mesh = {
        geometry: { dispose: jest.fn() },
        material: { dispose: jest.fn() },
        isMesh: true,
      } as unknown as THREE.Mesh;
      const scene = { remove: jest.fn(), traverse: jest.fn((cb: (o: unknown) => void) => { cb(mesh); }) } as unknown as THREE.Scene;
      const renderer = { dispose: jest.fn() } as unknown as THREE.WebGLRenderer;
      const controls = { dispose: jest.fn() } as unknown as OrbitControls;
      disposeScene(scene, renderer, controls, null);
      expect((mesh as unknown as { geometry: { dispose: jest.Mock } }).geometry.dispose).toHaveBeenCalled();
      expect((mesh.material as unknown as { dispose: jest.Mock }).dispose).toHaveBeenCalled();
    });

    it('traverse disposes InstancedMesh with array material', () => {
      const mesh = {
        geometry: { dispose: jest.fn() },
        material: [{ dispose: jest.fn() }],
        isInstancedMesh: true,
      } as unknown as THREE.InstancedMesh;
      const scene = { remove: jest.fn(), traverse: jest.fn((cb: (o: unknown) => void) => { cb(mesh); }) } as unknown as THREE.Scene;
      const renderer = { dispose: jest.fn() } as unknown as THREE.WebGLRenderer;
      const controls = { dispose: jest.fn() } as unknown as OrbitControls;
      disposeScene(scene, renderer, controls, null);
      expect((mesh as unknown as { geometry: { dispose: jest.Mock } }).geometry.dispose).toHaveBeenCalled();
      expect((mesh.material as unknown as { dispose: jest.Mock }[])[0].dispose).toHaveBeenCalled();
    });
  });
});
