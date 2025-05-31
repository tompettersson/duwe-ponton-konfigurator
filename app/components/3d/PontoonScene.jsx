"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect } from "react";
import Toolbar from "../ui/Toolbar";
import Toast from "../ui/Toast";
import { useToast } from "../../hooks/useToast";
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
  // Toast notifications
  const { toasts, showToast, removeToast } = useToast();
  
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

  // Event handlers - Updated for new unit-based system
  const handleCellClick = useCallback(
    (clickData) => {
      const { gridX, gridZ, level, worldPosition } = clickData;
      
      if (selectedTool === TOOLS.ERASER) {
        // Remove element at grid position
        const elementToRemove = storeElements.find(el => 
          Math.abs(el.position.x - worldPosition.x) < 0.1 &&
          Math.abs(el.position.z - worldPosition.z) < 0.1 &&
          Math.abs(el.position.y - worldPosition.y) < 0.1
        );
        
        if (elementToRemove) {
          removeElementAtPosition(elementToRemove.position);
          showToast("Ponton entfernt", "success");
        }
      } else if (selectedTool === TOOLS.SINGLE_PONTOON) {
        // Check for overlaps at this exact position
        const occupied = storeElements.some(el => 
          Math.abs(el.position.x - worldPosition.x) < 0.1 &&
          Math.abs(el.position.z - worldPosition.z) < 0.1 &&
          Math.abs(el.position.y - worldPosition.y) < 0.1
        );
        
        // Check for support (only needed above ground level)
        const hasSupport = level <= 0 || storeElements.some(el => 
          Math.abs(el.position.x - worldPosition.x) < 0.1 &&
          Math.abs(el.position.z - worldPosition.z) < 0.1 &&
          Math.abs(el.position.y - (worldPosition.y - levelHeight)) < 0.1
        );
        
        if (!occupied && hasSupport) {
          const newElement = {
            position: worldPosition,
            type: 'single',
            rotation: 0,
          };
          addElement(newElement);
          showToast("Single Ponton platziert", "success");
        } else {
          if (occupied) {
            showToast("Position bereits belegt", "warning");
          } else if (!hasSupport) {
            showToast(`Ebene ${level} benötigt Unterstützung von darunter`, "info", 3000);
          }
        }
      }
    },
    [selectedTool, levelHeight, storeElements, addElement, removeElementAtPosition, showToast]
  );


  const handleToolSelect = useCallback((tool) => {
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
    if (storeElements.length > 0) {
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
        onCameraSwitch={handleCameraSwitch}
        isPerspective={isPerspective}
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
      
      {/* Toast notifications */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

export default PontoonScene;
