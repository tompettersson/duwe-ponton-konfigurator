"use client";

import React, { memo, useCallback } from "react";
import * as THREE from "three";
import { TOOLS } from "../../constants/grid";

/**
 * Simplified grid system that works correctly
 */
function SimpleGridSystem({ 
  onCellClick, 
  selectedTool, 
  elements = [], 
  currentLevel, 
  levelHeight 
}) {
  
  const handleCellClick = useCallback((x, z) => {
    // WICHTIG: Absolute Weltkoordinaten für Level-System
    const absolutePosition = { 
      x, 
      y: currentLevel * levelHeight,  // Absolute Y-Position für aktuelles Level
      z 
    };
    console.log("Simple grid click ABSOLUTE:", absolutePosition, "tool:", selectedTool);
    onCellClick(absolutePosition);
  }, [onCellClick, selectedTool, currentLevel, levelHeight]);

  const isOccupied = useCallback((x, z) => {
    return elements.some(el => 
      el.position.x === x && 
      el.position.z === z && 
      el.position.z === currentLevel * levelHeight
    );
  }, [elements, currentLevel, levelHeight]);

  const getCellColor = useCallback((x, z, hovered) => {
    if (isOccupied(x, z)) {
      return "rgba(255, 0, 0, 0.3)"; // Red for occupied
    }
    if (hovered) {
      if (selectedTool === TOOLS.SINGLE_PONTOON) {
        return "rgba(0, 255, 0, 0.6)"; // Green for single pontoon
      }
      if (selectedTool === TOOLS.DOUBLE_PONTOON) {
        return "rgba(0, 150, 255, 0.6)"; // Blue for double pontoon
      }
      if (selectedTool === TOOLS.ERASER) {
        return "rgba(255, 0, 0, 0.6)"; // Red for eraser
      }
    }
    return "rgba(255, 255, 255, 0.1)"; // Default
  }, [selectedTool, isOccupied]);

  // Create grid lines geometry
  const gridLines = React.useMemo(() => {
    const vertices = [];
    
    // Horizontal lines (along X) - align with cell boundaries
    for (let z = -5.5; z <= 4.5; z++) {
      vertices.push(-5.5, 0.01, z, 4.5, 0.01, z);
    }
    
    // Vertical lines (along Z) - align with cell boundaries  
    for (let x = -5.5; x <= 4.5; x++) {
      vertices.push(x, 0.01, -5.5, x, 0.01, 4.5);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }, []);

  // Create a simple 10x10 grid
  const gridCells = [];
  for (let x = -5; x < 5; x++) {
    for (let z = -5; z < 5; z++) {
      gridCells.push(
        <GridCellSimple
          key={`${x},${z}`}
          gridX={x}
          gridZ={z}
          position={[x, 0, z]}
          onClick={() => handleCellClick(x, z)}
          getCellColor={getCellColor}
        />
      );
    }
  }

  return (
    <>
      {/* Grid Lines */}
      <lineSegments geometry={gridLines}>
        <lineBasicMaterial color="#ffffff" opacity={0.5} transparent />
      </lineSegments>
      
      {/* Interactive Cells */}
      {gridCells}
    </>
  );
}

/**
 * Individual grid cell component
 */
function GridCellSimple({ gridX, gridZ, position, onClick, getCellColor }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <mesh
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <boxGeometry args={[0.9, 0.05, 0.9]} />
      <meshBasicMaterial
        color={getCellColor(gridX, gridZ, hovered)}
        transparent={true}
        opacity={hovered ? 0.8 : 0.2}
      />
    </mesh>
  );
}

export default memo(SimpleGridSystem);