"use client";

import React, { useState } from "react";
import GridElement from "./GridElement";

function GridCell({ position, onCellClick, selectedTool, elements }) {
  const [hovered, setHovered] = useState(false);

  // Helper function to check if a position is occupied (same as in PontoonScene)
  const isPositionOccupied = (x, z) => {
    return elements?.some((element) => {
      if (element.type === "double") {
        const elementStart = element.position[0];
        const elementEnd = elementStart + 1;
        return (
          element.position[2] === z && x >= elementStart && x <= elementEnd
        );
      } else {
        return element.position[0] === x && element.position[2] === z;
      }
    });
  };

  // Check if the current position allows placement
  const canPlaceHere = () => {
    const x = position[0];
    const z = position[2];

    if (selectedTool === "singlePontoon") {
      return !isPositionOccupied(x, z);
    } else if (selectedTool === "doublePontoon") {
      // Check if we're too close to the right edge
      if (x >= 19) return false; // Using 19 as it's gridSize.width/2 - 1
      // Check if either position is occupied
      return !isPositionOccupied(x, z) && !isPositionOccupied(x + 1, z);
    }
    return true; // For delete tool, always allow hover
  };

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setHovered(true);
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    setHovered(false);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onCellClick(position);
  };

  const renderPreview = () => {
    if (!hovered || (selectedTool !== "deleteTool" && !canPlaceHere())) {
      return null;
    }

    switch (selectedTool) {
      case "singlePontoon":
        return (
          <GridElement position={position} color="#00ccff" type="single" />
        );
      case "doublePontoon":
        return (
          <GridElement position={position} color="#00ccff" type="double" />
        );
      case "deleteTool": {
        // Find if we're hovering over a double pontoon
        const hoveredElement = elements?.find((element) => {
          if (element.type === "double") {
            const elementStart = element.position[0];
            const elementEnd = elementStart + 1;
            return (
              element.position[2] === position[2] &&
              position[0] >= elementStart &&
              position[0] <= elementEnd
            );
          } else {
            return (
              element.position[0] === position[0] &&
              element.position[2] === position[2]
            );
          }
        });

        if (hoveredElement?.type === "double") {
          // Show preview for entire double pontoon
          return (
            <GridElement
              position={hoveredElement.position}
              color="#FF6B6B"
              type="double"
            />
          );
        }
        // Show preview for single pontoon
        return <GridElement position={position} color="#FF6B6B" />;
      }
      default:
        return null;
    }
  };

  return (
    <group>
      <mesh
        position={position}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {renderPreview()}
    </group>
  );
}

export default GridCell;
