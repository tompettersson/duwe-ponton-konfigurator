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
  
  const isOccupied = useCallback((x, z) => {
    return elements.some(el => 
      el.position.x === x && 
      el.position.z === z && 
      el.position.y === currentLevel * levelHeight
    );
  }, [elements, currentLevel, levelHeight]);

  const hasSupport = useCallback((x, z) => {
    // Ground level and underwater always have support
    if (currentLevel <= 0) return true;
    
    // Check if there's a pontoon directly below
    return elements.some(el => 
      el.position.x === x && 
      el.position.z === z && 
      el.position.y === (currentLevel - 1) * levelHeight
    );
  }, [elements, currentLevel, levelHeight]);

  const canPlace = useCallback((x, z) => {
    if (isOccupied(x, z)) return false;
    return hasSupport(x, z);
  }, [isOccupied, hasSupport]);

  const handleCellClick = useCallback((x, z) => {
    // Check if placement is valid before sending to parent
    const canPlaceHere = canPlace(x, z);
    
    const absolutePosition = { 
      x, 
      y: currentLevel * levelHeight,
      z 
    };
    
    // Debug logging removed for cleaner console
    
    // Always send click to parent - let PontoonScene handle validation and show toasts
    onCellClick(absolutePosition);
  }, [onCellClick, selectedTool, currentLevel, levelHeight, canPlace, isOccupied, hasSupport]);

  const getCellColor = useCallback((x, z, hovered) => {
    if (isOccupied(x, z)) {
      return "#ff0000"; // Red for occupied
    }
    if (hovered) {
      const canPlaceHere = canPlace(x, z);
      
      if (selectedTool === TOOLS.ERASER) {
        return "#ff0000"; // Red for eraser
      }
      
      if (!canPlaceHere) {
        return "#ff6464"; // Light red for invalid placement
      }
      
      if (selectedTool === TOOLS.SINGLE_PONTOON) {
        return "#00ff00"; // Green for valid single pontoon
      }
      if (selectedTool === TOOLS.DOUBLE_PONTOON) {
        return "#0096ff"; // Blue for valid double pontoon
      }
    }
    return "#ffffff"; // Default white
  }, [selectedTool, isOccupied, canPlace]);

  const getCellOpacity = useCallback((x, z, hovered) => {
    if (isOccupied(x, z)) {
      return 0.3;
    }
    if (hovered) {
      return 0.6;
    }
    return 0.1;
  }, [isOccupied]);

  // Create corner cross markers geometry
  const cornerCrosses = React.useMemo(() => {
    const vertices = [];
    const crossSize = 0.15; // Size of each cross
    
    // Create small cross markers at grid intersections
    for (let x = -5.5; x <= 4.5; x++) {
      for (let z = -5.5; z <= 4.5; z++) {
        const y = currentLevel * levelHeight + 0.01;
        
        // Horizontal line of cross
        vertices.push(
          x - crossSize, y, z,
          x + crossSize, y, z
        );
        
        // Vertical line of cross
        vertices.push(
          x, y, z - crossSize,
          x, y, z + crossSize
        );
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }, [currentLevel, levelHeight]);

  // Create a simple 10x10 grid
  const gridCells = [];
  for (let x = -5; x < 5; x++) {
    for (let z = -5; z < 5; z++) {
      gridCells.push(
        <GridCellSimple
          key={`${x},${z}`}
          gridX={x}
          gridZ={z}
          position={[x, currentLevel * levelHeight, z]}
          onClick={() => handleCellClick(x, z)}
          getCellColor={getCellColor}
          getCellOpacity={getCellOpacity}
        />
      );
    }
  }

  return (
    <>
      {/* Corner Cross Markers */}
      <lineSegments geometry={cornerCrosses}>
        <lineBasicMaterial 
          color="#ffffff" 
          opacity={0.6} 
          transparent 
          toneMapped={false}
          depthWrite={false}
        />
      </lineSegments>
      
      {/* Interactive Cells */}
      {gridCells}
    </>
  );
}

/**
 * Individual grid cell component
 */
function GridCellSimple({ gridX, gridZ, position, onClick, getCellColor, getCellOpacity }) {
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
        opacity={getCellOpacity(gridX, gridZ, hovered)}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

export default memo(SimpleGridSystem);