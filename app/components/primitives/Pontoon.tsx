/**
 * Pontoon - Individual Pontoon Component
 * 
 * Simple box geometry with mathematical precision
 * Focus on exact positioning and selection visualization
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useConfiguratorStore } from '../../store/configuratorStore';
import { LAYERS, GRID_CONSTANTS, COLORS } from '../../lib/constants';
import type { PontoonElement } from '../../types';

interface PontoonProps {
  pontoon: PontoonElement;
  isSelected: boolean;
}

export function Pontoon({ pontoon, isSelected }: PontoonProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const outlineRef = useRef<THREE.Mesh>(null);
  const gridMath = useConfiguratorStore((state) => state.gridMath);

  // Calculate exact world position
  const worldPosition = useMemo(() => {
    const pos = gridMath.gridToWorld(pontoon.gridPosition);
    
    // For double pontoons, offset position to center between two grid cells
    if (pontoon.type === 'double') {
      const cellSize = GRID_CONSTANTS.CELL_SIZE_MM / GRID_CONSTANTS.PRECISION_FACTOR;
      pos.x += cellSize / 2; // Move right by half a cell to center between two cells
    }
    
    // Position pontoon so bottom sits on grid plane
    pos.y = (GRID_CONSTANTS.PONTOON_HEIGHT_MM / GRID_CONSTANTS.PRECISION_FACTOR) / 2;
    
    return pos;
  }, [pontoon.gridPosition, pontoon.type, gridMath]);

  // Calculate exact pontoon dimensions in meters
  const dimensions = useMemo(() => {
    const cellSize = GRID_CONSTANTS.CELL_SIZE_MM / GRID_CONSTANTS.PRECISION_FACTOR;
    const height = GRID_CONSTANTS.PONTOON_HEIGHT_MM / GRID_CONSTANTS.PRECISION_FACTOR;
    
    return {
      width: pontoon.type === 'double' ? cellSize * 2 : cellSize, // Double pontoons are 2x width
      height: height,
      depth: cellSize,
    };
  }, [pontoon.type]);

  // Update selection outline visibility
  useFrame(() => {
    if (outlineRef.current) {
      outlineRef.current.visible = isSelected;
    }
  });

  // Get color from pontoon color property
  const pontoonColor = useMemo(() => {
    return COLORS.PONTOON_COLORS[pontoon.color];
  }, [pontoon.color]);

  return (
    <group 
      position={[worldPosition.x, worldPosition.y, worldPosition.z]} 
      rotation={[0, (pontoon.rotation * Math.PI) / 180, 0]}
    >
      {/* Main Pontoon Geometry */}
      <mesh
        ref={meshRef}
        userData={{ pontoonId: pontoon.id }}
        layers={LAYERS.PONTOONS}
        castShadow={false} // Disabled for minimal implementation
        receiveShadow={false}
        visible={true} // Force visibility
      >
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
        <meshBasicMaterial 
          color={pontoonColor}
          transparent={false}
        />
      </mesh>

      {/* Selection Outline - Temporarily disabled */}
      {false && (
        <mesh 
          ref={outlineRef} 
          visible={false}
          position={[0, 0, 0]}
        >
          <boxGeometry 
            args={[
              dimensions.width * 1.05, 
              dimensions.height * 1.05, 
              dimensions.depth * 1.05
            ]} 
          />
          <meshBasicMaterial
            color={COLORS.SELECTION_OUTLINE}
            wireframe
            depthTest={false}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

    </group>
  );
}