"use client";

import React, { memo, useMemo } from "react";
import { BASE_UNIT, PONTOON_TYPES } from "../../constants/units.js";
import { PontoonElement } from "../../utils/PontoonElement.js";

// COLOR MAPPING - 4 pontoon colors from the UI
const PONTOON_COLORS = {
  blue: '#5578B7',
  black: '#111111', 
  grey: '#DFE0E1',
  yellow: '#F6DE91'
};

/**
 * Uniform Pontoon Rendering - All pontoons as simple boxes with exact dimensions
 * No more mixed rendering, no more 3D models, no more position offsets
 * Perfect mathematical alignment with grid system
 */
function UniformPontoons({ elements = [], opacity = 1, levelColor = null }) {
  
  // Convert legacy elements to new PontoonElement format if needed
  const normalizedElements = useMemo(() => {
    return elements.map(element => {
      // If already a PontoonElement, use as-is
      if (element instanceof PontoonElement) {
        return element;
      }
      
      // Convert legacy element format
      const gridPos = worldToGrid(element.position.x, element.position.z);
      const type = element.type === 'DOUBLE' ? 'double' : 'single';
      
      return new PontoonElement(
        type,
        gridPos.x,
        gridPos.z,
        element.level || 0,
        element.color || 'blue'
      );
    });
  }, [elements]);
  
  return (
    <group>
      {normalizedElements.map((element) => {
        const geometry = element.getGeometry();
        const color = levelColor || PONTOON_COLORS[element.color] || PONTOON_COLORS.blue;
        
        return (
          <mesh
            key={element.id}
            position={[
              element.worldPosition.x,
              element.worldPosition.y, 
              element.worldPosition.z
            ]}
          >
            <boxGeometry 
              args={[
                geometry.width,
                geometry.height, 
                geometry.depth
              ]} 
            />
            <meshStandardMaterial 
              color={color}
              transparent={opacity < 1}
              opacity={opacity}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Helper function for legacy compatibility
function worldToGrid(worldX, worldZ) {
  return {
    x: Math.round(worldX / BASE_UNIT.width),
    z: Math.round(worldZ / BASE_UNIT.depth)
  };
}

/**
 * Preview component for hover/placement preview
 */
export function PontoonPreview({ type, gridX, gridZ, level = 0, color = 'blue', opacity = 0.5 }) {
  const previewElement = new PontoonElement(type, gridX, gridZ, level, color);
  const geometry = previewElement.getGeometry();
  const materialColor = PONTOON_COLORS[color] || PONTOON_COLORS.blue;
  
  return (
    <mesh
      position={[
        previewElement.worldPosition.x,
        previewElement.worldPosition.y,
        previewElement.worldPosition.z
      ]}
    >
      <boxGeometry 
        args={[
          geometry.width,
          geometry.height,
          geometry.depth
        ]} 
      />
      <meshStandardMaterial 
        color={materialColor}
        transparent={true}
        opacity={opacity}
        wireframe={opacity < 0.3}
      />
    </mesh>
  );
}

export default memo(UniformPontoons);