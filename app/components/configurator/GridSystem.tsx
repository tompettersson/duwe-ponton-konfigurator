/**
 * GridSystem - Mathematical Precision Grid Visualization
 * 
 * Displays exact 0.4m x 0.4m grid with hover indicators
 * Completely fills the space for spatial reference
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useConfiguratorStore } from '../../store/configuratorStore';
import { COLORS, LAYERS } from '../../lib/constants';

export function GridSystem() {
  const { 
    gridSize, 
    cellSize, 
    hoveredCell, 
    canPlacePontoon,
    gridMath 
  } = useConfiguratorStore();
  
  const groundRef = useRef<THREE.Mesh>(null);
  const hoverRef = useRef<THREE.Mesh>(null);

  // Create 3D grid lines geometry - multiple levels for depth perception
  const gridGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const halfWidth = (gridSize.width * cellSize) / 2;
    const halfHeight = (gridSize.height * cellSize) / 2;
    
    // Define grid levels for 3D visualization
    const levels = [-1, 0, 1, 2]; // Y levels in grid units
    const levelHeight = cellSize; // 0.4m between levels

    for (const level of levels) {
      const y = level * levelHeight;
      const isMainLevel = level === 0; // Y=0 is the main building level
      
      // Vertical lines (parallel to Z-axis) for each level
      for (let i = 0; i <= gridSize.width; i++) {
        const x = -halfWidth + i * cellSize;
        points.push(new THREE.Vector3(x, y, -halfHeight));
        points.push(new THREE.Vector3(x, y, halfHeight));
      }

      // Horizontal lines (parallel to X-axis) for each level
      for (let i = 0; i <= gridSize.height; i++) {
        const z = -halfHeight + i * cellSize;
        points.push(new THREE.Vector3(-halfWidth, y, z));
        points.push(new THREE.Vector3(halfWidth, y, z));
      }
    }

    // Vertical connector lines (parallel to Y-axis) at grid intersections
    for (let i = 0; i <= gridSize.width; i++) {
      for (let j = 0; j <= gridSize.height; j++) {
        const x = -halfWidth + i * cellSize;
        const z = -halfHeight + j * cellSize;
        points.push(new THREE.Vector3(x, -levelHeight, z));
        points.push(new THREE.Vector3(x, 2 * levelHeight, z));
      }
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [gridSize, cellSize]);

  // Ground plane dimensions
  const groundSize = useMemo(() => ({
    width: gridSize.width * cellSize,
    height: gridSize.height * cellSize,
  }), [gridSize, cellSize]);

  // Update hover indicator position and color - only on Y=0 level
  useFrame(() => {
    if (hoverRef.current && hoveredCell && hoveredCell.y === 0) {
      // Convert grid position to world position
      const worldPos = gridMath.gridToWorld(hoveredCell);
      // Position hover box at pontoon height (center of box)
      const pontoonHeight = 0.5; // 500mm in meters
      hoverRef.current.position.set(worldPos.x, pontoonHeight / 2, worldPos.z);

      // Update hover color based on validity
      const isValid = canPlacePontoon(hoveredCell);
      const material = hoverRef.current.material as THREE.MeshBasicMaterial;
      material.color.set(isValid ? '#4a90e2' : '#ff4444'); // Blue for valid, red for invalid
      material.opacity = isValid ? 0.5 : 0.3;
      hoverRef.current.visible = true;
    } else {
      if (hoverRef.current) {
        hoverRef.current.visible = false;
      }
    }
  });

  return (
    <>
      {/* Grid Lines */}
      <lineSegments 
        geometry={gridGeometry}
        layers={LAYERS.GRID}
      >
        <lineBasicMaterial 
          color={COLORS.GRID_LINE}
          opacity={0.8} 
          transparent={false}
          depthWrite={true}
        />
      </lineSegments>

      {/* Ground Plane (invisible, for raycasting) */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        layers={LAYERS.GRID}
        visible={false}
        userData={{ isGround: true }}
      >
        <planeGeometry args={[groundSize.width, groundSize.height]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Hover Indicator - 3D Box Preview */}
      <mesh
        ref={hoverRef}
        layers={LAYERS.HOVER}
        visible={hoveredCell !== null}
      >
        <boxGeometry args={[cellSize, 0.5, cellSize]} />
        <meshBasicMaterial
          color="#4a90e2"
          opacity={0.5}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Grid Base - Minimal background */}
      <mesh
        position={[0, -0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={false}
        layers={10} // Different layer so it doesn't interfere with raycasting
      >
        <planeGeometry args={[groundSize.width * 1.1, groundSize.height * 1.1]} />
        <meshStandardMaterial 
          color={COLORS.GRID_BACKGROUND} 
          roughness={0.9}
          metalness={0.0}
          opacity={0.3}
          transparent
        />
      </mesh>
    </>
  );
}