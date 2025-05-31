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

  // Create grid lines geometry - spans entire space
  const gridGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const halfWidth = (gridSize.width * cellSize) / 2;
    const halfHeight = (gridSize.height * cellSize) / 2;

    // Vertical lines (parallel to Z-axis)
    for (let i = 0; i <= gridSize.width; i++) {
      const x = -halfWidth + i * cellSize;
      points.push(new THREE.Vector3(x, 0, -halfHeight));
      points.push(new THREE.Vector3(x, 0, halfHeight));
    }

    // Horizontal lines (parallel to X-axis)
    for (let i = 0; i <= gridSize.height; i++) {
      const z = -halfHeight + i * cellSize;
      points.push(new THREE.Vector3(-halfWidth, 0, z));
      points.push(new THREE.Vector3(halfWidth, 0, z));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [gridSize, cellSize]);

  // Ground plane dimensions
  const groundSize = useMemo(() => ({
    width: gridSize.width * cellSize,
    height: gridSize.height * cellSize,
  }), [gridSize, cellSize]);

  // Update hover indicator position and color
  useFrame(() => {
    if (hoverRef.current && hoveredCell) {
      // Convert grid position to world position
      const worldPos = gridMath.gridToWorld(hoveredCell);
      hoverRef.current.position.set(worldPos.x, 0.01, worldPos.z);

      // Update hover color based on validity
      const isValid = canPlacePontoon(hoveredCell);
      const material = hoverRef.current.material as THREE.MeshBasicMaterial;
      material.color.set(isValid ? COLORS.HOVER_VALID : COLORS.HOVER_INVALID);
      material.opacity = isValid ? 0.3 : 0.2;
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

      {/* Hover Indicator */}
      <mesh
        ref={hoverRef}
        rotation={[-Math.PI / 2, 0, 0]}
        layers={LAYERS.HOVER}
        visible={hoveredCell !== null}
      >
        <planeGeometry args={[cellSize * 0.95, cellSize * 0.95]} />
        <meshBasicMaterial
          color={COLORS.HOVER_VALID}
          opacity={0.3}
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