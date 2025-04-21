"use client";

import dynamic from "next/dynamic";
import React, { useState, useCallback } from "react";
import Toolbar from "../ui/Toolbar";
import { useGridPositions } from "../../hooks/useGridPositions";
import { useElementManagement } from "../../hooks/useElementManagement";
import {
  DEFAULT_GRID_SIZE,
  WATER_LEVEL,
  LEVEL_HEIGHT,
  TOOLS,
} from "../../constants/grid";

// Dynamically import Three.js components with no SSR
const Scene = dynamic(() => import("./Scene").then((mod) => mod.default), {
  ssr: false,
});

function PontoonScene() {
  // State
  const [currentLevel, setCurrentLevel] = useState(0);
  const [elements, setElements] = useState({
    "-1": [], // Underwater level
    0: [], // Ground level
    1: [], // First level
    2: [], // Second level
  });
  const [isPerspective, setIsPerspective] = useState(true);
  const [selectedTool, setSelectedTool] = useState(TOOLS.SINGLE_PONTOON);

  // Grid size and constants
  const gridSize = DEFAULT_GRID_SIZE;
  const waterLevel = WATER_LEVEL;
  const levelHeight = LEVEL_HEIGHT;

  // Custom hooks
  const { isPositionOccupied, createGridElements, flattenElements } =
    useGridPositions();
  const { handleElementAction } = useElementManagement(
    isPositionOccupied,
    waterLevel,
    levelHeight
  );

  // Event handlers
  const handleCellClick = useCallback(
    (position) => {
      setElements((prevElements) => {
        const updatedElements = handleElementAction(
          selectedTool,
          position,
          currentLevel,
          prevElements,
          gridSize.width
        );

        return updatedElements || prevElements;
      });
    },
    [selectedTool, currentLevel, gridSize.width, handleElementAction]
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

  // Compute grid elements for rendering
  const gridElements = createGridElements(
    gridSize,
    handleCellClick,
    selectedTool,
    elements,
    currentLevel,
    levelHeight
  );

  // Flatten elements for rendering
  const allElements = flattenElements(elements, currentLevel);

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
