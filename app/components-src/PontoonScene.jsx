"use client";

import dynamic from "next/dynamic";
import React, { useState, useCallback, useMemo } from "react";
import Toolbar from "./Toolbar";

// Dynamically import Three.js components with no SSR
const Scene = dynamic(() => import("./Scene").then((mod) => mod.default), {
  ssr: false,
});

function PontoonScene() {
  const [elements, setElements] = useState([]);
  const [isPerspective, setIsPerspective] = useState(true);
  const [selectedTool, setSelectedTool] = useState("singlePontoon");
  const gridSize = { width: 40, depth: 30, height: 1 };
  const waterLevel = 0;

  // Helper function to check if a position is occupied
  const isPositionOccupied = (x, z, prevElements) => {
    return prevElements.some((element) => {
      if (element.type === "double") {
        // Check both cells of double pontoon
        const elementStart = element.position[0];
        const elementEnd = elementStart + 1;
        return (
          element.position[2] === z && x >= elementStart && x <= elementEnd
        );
      } else {
        // Check single pontoon position
        return element.position[0] === x && element.position[2] === z;
      }
    });
  };

  const handleCellClick = useCallback(
    (position) => {
      if (selectedTool === "singlePontoon") {
        setElements((prevElements) => {
          // Check if position is already occupied
          if (isPositionOccupied(position[0], position[2], prevElements)) {
            return prevElements;
          }

          const newElement = {
            position: [position[0], waterLevel, position[2]],
            type: "single",
          };
          return [...prevElements, newElement];
        });
      } else if (selectedTool === "doublePontoon") {
        // Check if we're too close to the right edge
        if (position[0] >= gridSize.width / 2 - 1) return;

        setElements((prevElements) => {
          // Check if either position is occupied
          if (
            isPositionOccupied(position[0], position[2], prevElements) ||
            isPositionOccupied(position[0] + 1, position[2], prevElements)
          ) {
            return prevElements;
          }

          const newElement = {
            position: [position[0], waterLevel, position[2]],
            type: "double",
          };
          return [...prevElements, newElement];
        });
      } else if (selectedTool === "deleteTool") {
        setElements((prevElements) =>
          prevElements.filter((element) => {
            if (element.type === "double") {
              // For double pontoons, check both cells it occupies
              const elementStart = element.position[0];
              const elementEnd = elementStart + 1;
              return !(
                element.position[2] === position[2] &&
                position[0] >= elementStart &&
                position[0] <= elementEnd
              );
            } else {
              // For single pontoons, check exact position
              return !(
                element.position[0] === position[0] &&
                element.position[2] === position[2]
              );
            }
          })
        );
      }
    },
    [selectedTool, waterLevel, gridSize.width]
  );

  const handleToolSelect = useCallback((tool) => {
    setSelectedTool(tool);
  }, []);

  const handleCameraSwitch = useCallback(() => {
    setIsPerspective((prev) => !prev);
  }, []);

  const gridElements = useMemo(
    () =>
      Array.from({ length: gridSize.width * gridSize.depth }, (_, index) => {
        const x = (index % gridSize.width) - gridSize.width / 2;
        const z = Math.floor(index / gridSize.width) - gridSize.depth / 2;
        return {
          key: `${x},0,${z}`,
          position: [x + 0.5, 0, z + 0.5],
          onCellClick: handleCellClick,
          selectedTool,
          elements,
        };
      }),
    [gridSize, handleCellClick, selectedTool, elements]
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Toolbar
        onSelect={handleToolSelect}
        onCameraSwitch={handleCameraSwitch}
        isPerspective={isPerspective}
      />
      <div style={{ flex: 1, position: "relative" }}>
        <Scene
          gridSize={gridSize}
          waterLevel={waterLevel}
          elements={elements}
          gridElements={gridElements}
          isPerspective={isPerspective}
        />
      </div>
    </div>
  );
}

export default PontoonScene;
