"use client";

import React, { useState } from "react";
import GridElement from "./GridElement";

function GridCell({ position, onCellClick, selectedTool, elements }) {
  const [hovered, setHovered] = useState(false);

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
    if (!hovered) return null;

    switch (selectedTool) {
      case "singlePontoon":
        return <GridElement position={position} opacity={0.5} type="single" />;
      case "doublePontoon":
        return <GridElement position={position} opacity={0.5} type="double" />;
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
              opacity={0.5}
              color="red"
              type="double"
            />
          );
        }
        // Show preview for single pontoon
        return <GridElement position={position} opacity={0.5} color="red" />;
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
