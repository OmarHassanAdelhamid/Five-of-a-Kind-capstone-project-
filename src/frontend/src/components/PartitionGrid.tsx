import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Partition } from '../utils/api'


interface PartitionGridProps {
  partitions: Partition[];
  selectedPartition: string | null;
  onPartitionSelect: (partitionName: string) => void;
}

export const PartitionGrid = ({
  partitions,
  selectedPartition,
  onPartitionSelect,
}: PartitionGridProps) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    mount.innerHTML = '';
    
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(4, 4, 6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(120, 120);
    mount.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    // Create grid of cubes
    const geometry = new THREE.BoxGeometry(2, 2, 2);
  

    const cubeObjects: THREE.Mesh[] = [];
    const cubeSpacing = 2;
    const edgeGeometries: THREE.EdgesGeometry[] = [];
    const cubeMaterials: THREE.MeshBasicMaterial[] = [];

    for (const partition of partitions) {
      const material = new THREE.MeshBasicMaterial({
        color: partition.name === selectedPartition ? 0xff9ecf : 0x60a5fa,
        transparent: true,
        opacity: partition.name === selectedPartition ? 0.9 : 0.15,
      });

      const cube = new THREE.Mesh(geometry, material);

      cube.position.set(
        partition.x * cubeSpacing,
        partition.y * cubeSpacing,
        partition.z * cubeSpacing
      );

      const edges = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        opacity: 0.6,
        transparent: true,
      });
      const edgeLines = new THREE.LineSegments(edges, edgeMaterial);

      cube.add(edgeLines);
      
      cube.userData.partitionName = partition.name;
      scene.add(cube);
      cubeObjects.push(cube);
    }

    if (cubeObjects.length > 0) {
      const box = new THREE.Box3().setFromObject(scene);
      const center = new THREE.Vector3();
      box.getCenter(center);
      scene.position.sub(center);
    }

    renderer.render(scene, camera);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(cubeObjects);

      if (intersects.length > 0) {
        const clickedCube = intersects[0].object as THREE.Mesh;
        const partitionName = clickedCube.userData.partitionName as string;
        onPartitionSelect(partitionName);
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    return () => {
      renderer.domElement.removeEventListener('click', handleClick);
      geometry.dispose();
      cubeObjects.forEach((cube) => {
        (cube.material as THREE.Material).dispose();
      });
      renderer.dispose();
      mount.innerHTML = '';
    };
  }, [partitions, selectedPartition, onPartitionSelect]);

  return <div style={{ width: 120, height: 120 }} ref={mountRef} />;
};