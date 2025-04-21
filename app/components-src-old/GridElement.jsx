import React from "react";
import { RoundedBox } from "@react-three/drei";

function GridElement({ position, opacity = 1, color, type = "single", level }) {
  // Define colors for different types
  const getColor = () => {
    if (color) return color;
    return "#6D9FFF";
  };

  // Adjust size and position based on type
  const getSize = () => {
    switch (type) {
      case "double":
        return [1.96, 0.96, 0.96];
      default:
        return [0.96, 0.96, 0.96];
    }
  };

  // For double pontoons, center the position between the two grid cells
  const adjustedPosition = [...position];
  if (type === "double") {
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

export default GridElement;
