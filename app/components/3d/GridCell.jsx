"use client";

import React, { memo, useState } from "react";
import { TOOLS } from "../../constants/grid";

/**
 * Interactive grid cell component that handles user interactions
 */
function GridCell({
  position,
  onCellClick,
  selectedTool,
  elements = [],
  currentLevel,
  levelHeight,
}) {
  const [hovered, setHovered] = useState(false);

  // Determine if this cell is occupied
  const isOccupied = elements?.some((element) => {
    if (element.type === "double") {
      const elementX = element.position[0];
      const elementEndX = elementX + 1;
      return (
        element.position[2] === position[2] &&
        position[0] >= elementX &&
        position[0] <= elementEndX
      );
    }
    return (
      element.position[0] === position[0] && element.position[2] === position[2]
    );
  });

  // Determine cell color based on state
  const getCellColor = () => {
    if (isOccupied) {
      return "rgba(255, 0, 0, 0.2)"; // Red for occupied cells
    }

    if (hovered) {
      switch (selectedTool) {
        case TOOLS.SINGLE_PONTOON:
          return "rgba(0, 255, 0, 0.3)"; // Green for valid placement
        case TOOLS.DOUBLE_PONTOON:
          return "rgba(0, 200, 255, 0.3)"; // Blue for double pontoon
        case TOOLS.DELETE_TOOL:
          return "rgba(255, 0, 0, 0.3)"; // Red for delete tool
        default:
          return "rgba(255, 255, 255, 0.2)";
      }
    }

    return "rgba(255, 255, 255, 0.1)"; // Default semi-transparent white
  };

  // Handle click events
  const handleClick = () => {
    if (onCellClick) {
      onCellClick(position);
    }
  };

  // Show visual preview for double pontoon placement
  const showDoublePreview =
    selectedTool === TOOLS.DOUBLE_PONTOON && hovered && position[0] < 20 - 1; // Prevent out of bounds

  return (
    <>
      <mesh
        visible={hovered}
        position={position}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
      >
        <boxGeometry args={[0.9, 0.01, 0.9]} />
        <meshBasicMaterial
          color={getCellColor()}
          transparent
          opacity={hovered ? 0 : 0}
        />
      </mesh>

      {/* Preview for double pontoon */}
      {showDoublePreview && (
        <mesh position={[position[0] + 1, position[1], position[2]]}>
          <boxGeometry args={[0.9, 0.01, 0.9]} />
          <meshBasicMaterial
            color="rgba(0, 200, 255, 0.3)"
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
    </>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(GridCell);
