import React from "react";
import { Box, RoundedBox } from "@react-three/drei";

function GridElement({ position, opacity = 1, color, type = "single" }) {
  // Define colors for different types
  const getColor = () => {
    if (color) return color;
    return "#4D7FFF";
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

  const isPreview = opacity < 1;

  return (
    <RoundedBox args={getSize()} position={adjustedPosition}>
      {isPreview ? (
        <meshBasicMaterial
          attach="material"
          color={getColor()}
          wireframe={true}
          wireframeLinewidth={2}
        />
      ) : (
        <meshPhysicalMaterial
          attach="material"
          color={getColor()}
          roughness={0.5}
          metalness={0.1}
          clearcoat={0.3}
          clearcoatRoughness={0.25}
          transparent={false}
          depthWrite={true}
        />
      )}
    </RoundedBox>
  );
}

export default GridElement;
