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
  const [selectedTool, setSelectedTool] = useState(null);
  const gridSize = { width: 40, depth: 30, height: 1 };
  const waterLevel = 0;

  const handleCellClick = useCallback(
    (position) => {
      if (selectedTool === "singlePontoon") {
        setElements((prevElements) => {
          const newElement = {
            position: [position[0], waterLevel, position[2]],
            type: "single",
          };
          return [...prevElements, newElement];
        });
      } else if (selectedTool === "doublePontoon") {
        setElements((prevElements) => {
          if (position[0] + 1 >= gridSize.width / 2) return prevElements;

          const newElements = [
            {
              position: [position[0], waterLevel, position[2]],
              type: "double_left",
            },
            {
              position: [position[0] + 1, waterLevel, position[2]],
              type: "double_right",
            },
          ];
          return [...prevElements, ...newElements];
        });
      } else if (selectedTool === "deleteTool") {
        setElements((prevElements) =>
          prevElements.filter(
            (element) =>
              !(
                (element.position[0] === position[0] ||
                  element.position[0] === position[0] + 1) &&
                element.position[2] === position[2]
              )
          )
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
        };
      }),
    [gridSize, handleCellClick, selectedTool]
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
