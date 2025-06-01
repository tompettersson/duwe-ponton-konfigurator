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
    // Position pontoon so bottom sits on grid plane
    pos.y = (GRID_CONSTANTS.PONTOON_HEIGHT_MM / GRID_CONSTANTS.PRECISION_FACTOR) / 2;
    
    
    return pos;
  }, [pontoon.gridPosition, gridMath]);

  // Calculate exact pontoon dimensions in meters
  const dimensions = useMemo(() => {
    const cellSize = GRID_CONSTANTS.CELL_SIZE_MM / GRID_CONSTANTS.PRECISION_FACTOR;
    const height = GRID_CONSTANTS.PONTOON_HEIGHT_MM / GRID_CONSTANTS.PRECISION_FACTOR;
    
    return {
      width: cellSize,
      height: height,
      depth: cellSize,
    };
  }, []);

  // Update selection outline visibility
  useFrame(() => {
    if (outlineRef.current) {
      outlineRef.current.visible = isSelected;
    }
  });

  // Get color based on pontoon type
  const pontoonColor = useMemo(() => {
    switch (pontoon.type) {
      case 'corner':
        return '#ff6b35';
      case 'special':
        return '#4ecdc4';
      default:
        return COLORS.PONTOON_DEFAULT;
    }
  }, [pontoon.type]);

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

      {/* Type Indicator (for debugging/visual feedback) */}
      {process.env.NODE_ENV === 'development' && pontoon.type !== 'standard' && (
        <mesh position={[0, dimensions.height / 2 + 0.05, 0]}>
          <boxGeometry args={[0.1, 0.05, 0.1]} />
          <meshBasicMaterial 
            color={pontoon.type === 'corner' ? '#ff0000' : '#00ff00'} 
          />
        </mesh>
      )}
    </group>
  );
}