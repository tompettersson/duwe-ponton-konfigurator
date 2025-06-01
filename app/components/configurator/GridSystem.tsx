/**
 * GridSystem - Mathematical Precision Grid Visualization
 * 
 * Displays exact 0.5m x 0.5m grid with hover indicators
 * Completely fills the space for spatial reference
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
    currentPontoonColor 
  } = useConfiguratorStore();
  
  const groundRef = useRef<THREE.Mesh>(null);

  // Create single level grid with vertical indicators for 3D depth perception
  const gridGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const halfWidth = (gridSize.width * cellSize) / 2;
    const halfHeight = (gridSize.height * cellSize) / 2;
    const y = 0; // Ground level only

    // Horizontal lines (parallel to X-axis) at ground level
    for (let i = 0; i <= gridSize.height; i++) {
      const z = -halfHeight + i * cellSize;
      points.push(new THREE.Vector3(-halfWidth, y, z));
      points.push(new THREE.Vector3(halfWidth, y, z));
    }

    // Vertical lines (parallel to Z-axis) at ground level  
    for (let i = 0; i <= gridSize.width; i++) {
      const x = -halfWidth + i * cellSize;
      points.push(new THREE.Vector3(x, y, -halfHeight));
      points.push(new THREE.Vector3(x, y, halfHeight));
    }

    // Add sparse vertical indicators for 3D depth perception
    // Only at every 5th intersection to avoid clutter
    const step = 5;
    for (let i = 0; i <= gridSize.width; i += step) {
      for (let j = 0; j <= gridSize.height; j += step) {
        const x = -halfWidth + i * cellSize;
        const z = -halfHeight + j * cellSize;
        // Short vertical lines showing 3D space
        points.push(new THREE.Vector3(x, 0, z));
        points.push(new THREE.Vector3(x, cellSize, z)); // Up to current cellSize height
      }
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [gridSize, cellSize]);

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

      {/* Hover Indicator - Real Pontoon Preview */}
      {hoveredCell && hoveredCell.y === 0 && (
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