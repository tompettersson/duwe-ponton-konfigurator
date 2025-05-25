"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect } from "react";
import Toolbar from "../ui/Toolbar";
import {
  DEFAULT_GRID_SIZE,
  WATER_LEVEL,
  LEVEL_HEIGHT,
  TOOLS,
} from "../../constants/grid";
import useStore from "../../store/useStore";

// Dynamically import Three.js components with no SSR
const Scene = dynamic(() => import("./Scene").then((mod) => mod.default), {
  ssr: false,
});

function PontoonScene() {
  // Initialize from localStorage on mount
  const initializeFromStorage = useStore((state) => state.initializeFromStorage);
  
  useEffect(() => {
    initializeFromStorage();
  }, [initializeFromStorage]);
  // Zustand state
  const currentLevel = useStore((state) => state.grid.currentLevel);
  const setCurrentLevel = useStore((state) => state.setCurrentLevel);
  const storeElements = useStore((state) => state.grid.elements);
  const addElement = useStore((state) => state.addElement);
  const removeElementAtPosition = useStore((state) => state.removeElementAtPosition);
  const clearGrid = useStore((state) => state.clearGrid);
  const selectedTool = useStore((state) => state.tool.current);
  const setSelectedTool = useStore((state) => state.setCurrentTool);
  const isPerspective = useStore((state) => state.ui.viewMode === '3d');
  const setViewMode = useStore((state) => state.setViewMode);
  

  // Grid size and constants
  const gridSize = DEFAULT_GRID_SIZE;
  const waterLevel = WATER_LEVEL;
  const levelHeight = LEVEL_HEIGHT;

  // Event handlers
  const handleCellClick = useCallback(
    (position) => {
      console.log("PontoonScene handleCellClick:", position, "selectedTool:", selectedTool);
      if (selectedTool === TOOLS.ERASER) {
        // Remove element at position (position ist bereits absolut)
        removeElementAtPosition(position);
      } else if (selectedTool === TOOLS.SINGLE_PONTOON || selectedTool === TOOLS.DOUBLE_PONTOON) {
        // Add element if position is not occupied (position ist bereits absolut)
        const occupied = storeElements.some(
          el => el.position.x === position.x && 
               el.position.z === position.z && 
               Math.abs(el.position.y - position.y) < 0.1
        );
        
        console.log("Position occupied:", occupied, "storeElements:", storeElements.length);
        console.log("Target position:", position);
        
        if (!occupied) {
          const newElement = {
            position: position,  // Position ist bereits korrekt absolut
            type: selectedTool === TOOLS.SINGLE_PONTOON ? 'single' : 'double',
            rotation: 0,
          };
          console.log("Adding element:", newElement);
          addElement(newElement);
        }
      }
    },
    [selectedTool, currentLevel, levelHeight, storeElements, addElement, removeElementAtPosition]
  );


  const handleToolSelect = useCallback((tool) => {
    console.log("Tool selected:", tool);
    setSelectedTool(tool);
  }, [setSelectedTool]);

  const handleCameraSwitch = useCallback(() => {
    setViewMode(isPerspective ? '2d' : '3d');
  }, [isPerspective, setViewMode]);

  const handleLevelChange = useCallback((level) => {
    setCurrentLevel(level);
  }, [setCurrentLevel]);

  const handleClear = useCallback(() => {
    clearGrid();
  }, [clearGrid]);

  // Clear old elements on component mount (temporary fix)
  useEffect(() => {
    console.log("Current storeElements:", storeElements);
    if (storeElements.length > 0) {
      console.log("Auto-clearing old elements:", storeElements.length);
      clearGrid();
    }
  }, []);

  // Prepare elements for rendering with level information
  const allElements = storeElements.map(element => ({
    ...element,
    isCurrentLevel: element.position.y === currentLevel * levelHeight,
  }));

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Toolbar
        onSelect={handleToolSelect}
        onCameraSwitch={handleCameraSwitch}
        isPerspective={isPerspective}
        onLevelChange={handleLevelChange}
        currentLevel={currentLevel}
        onClear={handleClear}
      />
      <div style={{ flex: 1, position: "relative" }}>
        <Scene
          gridSize={gridSize}
          waterLevel={waterLevel}
          elements={allElements}
          onCellClick={handleCellClick}
          selectedTool={selectedTool}
          storeElements={storeElements}
          isPerspective={isPerspective}
          currentLevel={currentLevel}
          levelHeight={levelHeight}
        />
      </div>
    </div>
  );
}

export default PontoonScene;
