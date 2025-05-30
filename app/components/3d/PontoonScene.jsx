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
        const isDouble = selectedTool === TOOLS.DOUBLE_PONTOON;
        
        // Check for overlaps on the same level
        const checkOverlap = () => {
          // Filter elements on the same level
          const sameLevel = storeElements.filter(
            el => Math.abs(el.position.y - position.y) < 0.1
          );
          
          if (!isDouble) {
            // Single pontoon - check exact position match only
            return sameLevel.some(
              el => Math.abs(el.position.x - position.x) < 0.1 && 
                   Math.abs(el.position.z - position.z) < 0.1
            );
          }
          
          // Double pontoon overlap check - be more precise
          // New double pontoon spans from position.x to position.x + 1.096
          const newStart = position.x;
          const newEnd = position.x + 1.096;
          
          return sameLevel.some(el => {
            if (el.type === 'double') {
              // Check double-to-double overlap
              const elStart = el.position.x;
              const elEnd = el.position.x + 1.096;
              
              // Check if they're on the same Z row and if ranges overlap
              if (Math.abs(el.position.z - position.z) < 0.1) {
                return !(newEnd <= elStart || newStart >= elEnd); // Ranges overlap
              }
              return false;
            } else {
              // Check double-to-single overlap
              // Single pontoon is at el.position.x, occupies 0.5m width
              const singleStart = el.position.x - 0.25;
              const singleEnd = el.position.x + 0.25;
              
              // Check if they're on the same Z row and if ranges overlap
              if (Math.abs(el.position.z - position.z) < 0.1) {
                return !(newEnd <= singleStart || newStart >= singleEnd);
              }
              return false;
            }
          });
        };
        
        // Check if position has support (for levels above ground)
        const checkSupport = () => {
          if (currentLevel <= 0) return true;
          
          if (!isDouble) {
            // Single pontoon - needs support at its position
            return storeElements.some(
              el => el.position.x === position.x && 
                   el.position.z === position.z && 
                   el.position.y === (currentLevel - 1) * levelHeight
            );
          }
          
          // Double pontoon - needs support along its length
          // Check at least at start and middle positions
          const hasStartSupport = storeElements.some(
            el => Math.abs(el.position.x - position.x) < 0.25 && 
                 el.position.z === position.z && 
                 el.position.y === (currentLevel - 1) * levelHeight
          );
          
          const hasMiddleSupport = storeElements.some(
            el => Math.abs(el.position.x - (position.x + 0.5)) < 0.25 && 
                 el.position.z === position.z && 
                 el.position.y === (currentLevel - 1) * levelHeight
          );
          
          return hasStartSupport || hasMiddleSupport;
        };
        
        const occupied = checkOverlap();
        const hasSupport = checkSupport();
        
        if (!occupied && hasSupport) {
          const newElement = {
            position: position,
            type: isDouble ? 'double' : 'single',
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
