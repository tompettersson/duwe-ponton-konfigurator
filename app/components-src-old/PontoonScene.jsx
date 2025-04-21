"use client";

import dynamic from "next/dynamic";
import React, { useState, useCallback, useMemo } from "react";
import Toolbar from "./Toolbar";

// Dynamically import Three.js components with no SSR
const Scene = dynamic(() => import("./Scene").then((mod) => mod.default), {
  ssr: false,
});

function PontoonScene() {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [elements, setElements] = useState({
    "-1": [], // Underwater level
    0: [], // Ground level
    1: [], // First level
    2: [], // Second level
  });
  const [isPerspective, setIsPerspective] = useState(true);
  const [selectedTool, setSelectedTool] = useState("singlePontoon");
  const gridSize = { width: 40, depth: 30, height: 1 };
  const waterLevel = 0;
  const levelHeight = 1; // Height between levels

  // Helper function to check if a position is occupied
  const isPositionOccupied = (x, z, level, prevElements) => {
    return prevElements[level]?.some((element) => {
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

  const handleCellClick = useCallback(
    (position) => {
      if (selectedTool === "singlePontoon") {
        setElements((prevElements) => {
          if (
            isPositionOccupied(
              position[0],
              position[2],
              currentLevel,
              prevElements
            )
          ) {
            return prevElements;
          }

          const newElement = {
            position: [
              position[0],
              waterLevel + currentLevel * levelHeight,
              position[2],
            ],
            type: "single",
          };

          return {
            ...prevElements,
            [currentLevel]: [...prevElements[currentLevel], newElement],
          };
        });
      } else if (selectedTool === "doublePontoon") {
        if (position[0] >= gridSize.width / 2 - 1) return;

        setElements((prevElements) => {
          if (
            isPositionOccupied(
              position[0],
              position[2],
              currentLevel,
              prevElements
            ) ||
            isPositionOccupied(
              position[0] + 1,
              position[2],
              currentLevel,
              prevElements
            )
          ) {
            return prevElements;
          }

          const newElement = {
            position: [
              position[0],
              waterLevel + currentLevel * levelHeight,
              position[2],
            ],
            type: "double",
          };

          return {
            ...prevElements,
            [currentLevel]: [...prevElements[currentLevel], newElement],
          };
        });
      } else if (selectedTool === "deleteTool") {
        setElements((prevElements) => ({
          ...prevElements,
          [currentLevel]: prevElements[currentLevel].filter((element) => {
            if (element.type === "double") {
              const elementStart = element.position[0];
              const elementEnd = elementStart + 1;
              return !(
                element.position[2] === position[2] &&
                position[0] >= elementStart &&
                position[0] <= elementEnd
              );
            } else {
              return !(
                element.position[0] === position[0] &&
                element.position[2] === position[2]
              );
            }
          }),
        }));
      }
    },
    [selectedTool, waterLevel, gridSize.width, currentLevel, levelHeight]
  );

  const handleToolSelect = useCallback((tool) => {
    setSelectedTool(tool);
  }, []);

  const handleCameraSwitch = useCallback(() => {
    setIsPerspective((prev) => !prev);
  }, []);

  const handleLevelChange = useCallback((level) => {
    setCurrentLevel(level);
  }, []);

  const gridElements = useMemo(
    () =>
      Array.from({ length: gridSize.width * gridSize.depth }, (_, index) => {
        const x = (index % gridSize.width) - gridSize.width / 2;
        const z = Math.floor(index / gridSize.width) - gridSize.depth / 2;
        return {
          key: `${x},0,${z}`,
          position: [x + 0.5, currentLevel * levelHeight, z + 0.5],
          onCellClick: handleCellClick,
          selectedTool,
          elements: elements[currentLevel],
          currentLevel,
        };
      }),
    [
      gridSize,
      handleCellClick,
      selectedTool,
      elements,
      currentLevel,
      levelHeight,
    ]
  );

  // Flatten elements for rendering, adding level info
  const allElements = useMemo(() => {
    return Object.entries(elements).flatMap(([level, levelElements]) =>
      levelElements.map((element) => ({
        ...element,
        isCurrentLevel: parseInt(level) === currentLevel,
      }))
    );
  }, [elements, currentLevel]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Toolbar
        onSelect={handleToolSelect}
        onCameraSwitch={handleCameraSwitch}
        isPerspective={isPerspective}
        onLevelChange={handleLevelChange}
        currentLevel={currentLevel}
      />
      <div style={{ flex: 1, position: "relative" }}>
        <Scene
          gridSize={gridSize}
          waterLevel={waterLevel}
          elements={allElements}
          gridElements={gridElements}
          isPerspective={isPerspective}
          currentLevel={currentLevel}
          levelHeight={levelHeight}
        />
      </div>
    </div>
  );
}

export default PontoonScene;
