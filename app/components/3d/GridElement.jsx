"use client";

import React, { memo } from "react";
import { RoundedBox } from "@react-three/drei";
import { ELEMENT_TYPES, COLORS } from "../../constants/grid";

/**
 * Represents a 3D pontoon element in the grid
 */
function GridElement({
  position,
  opacity = 1,
  color,
  type = ELEMENT_TYPES.SINGLE,
  level,
}) {
  // Define colors for different types
  const getColor = () => {
    if (color) return color;
    return COLORS.PONTOON;
  };

  // Adjust size and position based on type
  const getSize = () => {
    switch (type) {
      case ELEMENT_TYPES.DOUBLE:
        return [1.96, 0.96, 0.96];
      default:
        return [0.96, 0.96, 0.96];
    }
  };

  // For double pontoons, center the position between the two grid cells
  const adjustedPosition = [...position];
  if (type === ELEMENT_TYPES.DOUBLE) {
    adjustedPosition[0] += 0.5;
  }

  // Apply underwater effect if on level -1
  const isUnderwater = level === -1;
  const finalOpacity = isUnderwater ? 0.7 : opacity;

  return (
    <RoundedBox
      args={getSize()}
      radius={0.1}
      smoothness={4}
      position={adjustedPosition}
    >
      <meshPhysicalMaterial
        attach="material"
        color={getColor()}
        roughness={0.5}
        metalness={0.1}
        clearcoat={0.3}
        clearcoatRoughness={0.25}
        transparent={true}
        opacity={finalOpacity}
      />
    </RoundedBox>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(GridElement);
