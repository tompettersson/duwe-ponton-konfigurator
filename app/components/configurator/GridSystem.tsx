/**
 * GridSystem - Multi-Level Mathematical Precision Grid Visualization
 * 
 * Displays 0.5m x 0.5m grid at any level with water surface and hover indicators
 * Grid moves to currentLevel, water surface remains at Y=0
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useConfiguratorStore } from '../../store/configuratorStore';
import { COLORS, LAYERS, GRID_CONSTANTS } from '../../lib/constants';
import { Pontoon } from '../primitives/Pontoon';

export function GridSystem() {
  const { 
    gridSize, 
    cellSize, 
    hoveredCell, 
    canPlacePontoon,
    gridMath,
    currentPontoonType,
    currentPontoonColor,
    currentLevel
  } = useConfiguratorStore();
  
  const groundRef = useRef<THREE.Mesh>(null);

  // Create grid at currentLevel Y position
  const gridGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const halfWidth = (gridSize.width * cellSize) / 2;
    const halfHeight = (gridSize.height * cellSize) / 2;
    const y = currentLevel; // Grid moves to current level

    // Horizontal lines (parallel to X-axis) at current level
    for (let i = 0; i <= gridSize.height; i++) {
      const z = -halfHeight + i * cellSize;
      points.push(new THREE.Vector3(-halfWidth, y, z));
      points.push(new THREE.Vector3(halfWidth, y, z));
    }

    // Vertical lines (parallel to Z-axis) at current level
    for (let i = 0; i <= gridSize.width; i++) {
      const x = -halfWidth + i * cellSize;
      points.push(new THREE.Vector3(x, y, -halfHeight));
      points.push(new THREE.Vector3(x, y, halfHeight));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [gridSize, cellSize, currentLevel]);

  // Ground plane dimensions
  const groundSize = useMemo(() => ({
    width: gridSize.width * cellSize,
    height: gridSize.height * cellSize,
  }), [gridSize, cellSize]);


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

      {/* Level Plane (invisible, for raycasting at current level) */}
      <mesh
        ref={groundRef}
        position={[0, currentLevel, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        layers={LAYERS.GRID}
        visible={false}
        userData={{ isGround: true }}
      >
        <planeGeometry args={[groundSize.width, groundSize.height]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Water Surface (always at Y=0, 50% transparent) */}
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={false}
        layers={10} // Different layer so it doesn't interfere with raycasting
      >
        <planeGeometry args={[groundSize.width * 1.1, groundSize.height * 1.1]} />
        <meshStandardMaterial 
          color="#87CEEB" // Sky blue for water
          roughness={0.1}
          metalness={0.1}
          opacity={0.5}
          transparent
        />
      </mesh>

      {/* Hover Indicator - Real Pontoon Preview on Current Level */}
      {hoveredCell && hoveredCell.y === currentLevel && (
        <Pontoon
          pontoon={{
            id: 'hover-preview',
            gridPosition: hoveredCell,
            type: currentPontoonType,
            color: currentPontoonColor,
            rotation: 0,
            metadata: { isPreview: true }
          }}
          isSelected={false}
          isPreview={true}
        />
      )}

      {/* Level Base - Minimal background at current level */}
      <mesh
        position={[0, currentLevel - 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={false}
        layers={10} // Different layer so it doesn't interfere with raycasting
      >
        <planeGeometry args={[groundSize.width * 1.1, groundSize.height * 1.1]} />
        <meshStandardMaterial 
          color={COLORS.GRID_BACKGROUND} 
          roughness={0.9}
          metalness={0.0}
          opacity={0.2}
          transparent
        />
      </mesh>
    </>
  );
}