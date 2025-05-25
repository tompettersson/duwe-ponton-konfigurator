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

  // Event handlers
  const handleCellClick = useCallback(
    (position) => {
      if (selectedTool === TOOLS.ERASER) {
        removeElementAtPosition(position);
      } else if (selectedTool === TOOLS.SINGLE_PONTOON || selectedTool === TOOLS.DOUBLE_PONTOON) {
        // Check if position is occupied
        const occupied = storeElements.some(
          el => el.position.x === position.x && 
               el.position.z === position.z && 
               Math.abs(el.position.y - position.y) < 0.1
        );
        
        // Check if position has support (for levels above ground)
        const hasSupport = currentLevel <= 0 || storeElements.some(
          el => el.position.x === position.x && 
               el.position.z === position.z && 
               el.position.y === (currentLevel - 1) * levelHeight
        );
        
        if (!occupied && hasSupport) {
          const newElement = {
            position: position,
            type: selectedTool === TOOLS.SINGLE_PONTOON ? 'single' : 'double',
            rotation: 0,
          };
          addElement(newElement);
        } else {
          if (occupied) {
            showToast("Position bereits belegt", "warning");
          } else if (!hasSupport) {
            if (currentLevel > 0) {
              showToast(`Ebene ${currentLevel} benötigt Unterstützung. Platziere zuerst Pontons auf Ebene 0.`, "info", 4000);
            } else {
              showToast("Ponton kann hier nicht platziert werden", "warning");
            }
          }
        }
      }
    },
    [selectedTool, currentLevel, levelHeight, storeElements, addElement, removeElementAtPosition, showToast]
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
