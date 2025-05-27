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
  
  // Grid spacing for pontoons: 0.5m cells (single pontoon = 0.5x0.5m, double = 1.0x0.5m)
  const gridSpacing = 0.5; // 500mm spacing (single pontoon size)
  
  const isOccupied = useCallback((x, z) => {
    const worldX = x * gridSpacing;
    const worldZ = z * gridSpacing;
    return elements.some(el => 
      Math.abs(el.position.x - worldX) < 0.1 && 
      Math.abs(el.position.z - worldZ) < 0.1 && 
      Math.abs(el.position.y - currentLevel * levelHeight) < 0.1
    );
  }, [elements, currentLevel, levelHeight, gridSpacing]);

  const hasSupport = useCallback((x, z) => {
    // Ground level and underwater always have support
    if (currentLevel <= 0) return true;
    
    // Check if there's a pontoon directly below
    const worldX = x * gridSpacing;
    const worldZ = z * gridSpacing;
    return elements.some(el => 
      Math.abs(el.position.x - worldX) < 0.1 && 
      Math.abs(el.position.z - worldZ) < 0.1 && 
      Math.abs(el.position.y - (currentLevel - 1) * levelHeight) < 0.1
    );
  }, [elements, currentLevel, levelHeight, gridSpacing]);

  const canPlace = useCallback((x, z) => {
    if (isOccupied(x, z)) return false;
    return hasSupport(x, z);
  }, [isOccupied, hasSupport]);

  const handleCellClick = useCallback((x, z) => {
    // Check if placement is valid before sending to parent
    const canPlaceHere = canPlace(x, z);
    
    const absolutePosition = { 
      x: x * gridSpacing, 
      y: currentLevel * levelHeight,
      z: z * gridSpacing 
    };
    
    // Debug logging removed for cleaner console
    
    // Always send click to parent - let PontoonScene handle validation and show toasts
    onCellClick(absolutePosition);
  }, [onCellClick, selectedTool, currentLevel, levelHeight, canPlace, isOccupied, hasSupport, gridSpacing]);

  const getCellColor = useCallback((x, z, hovered) => {
    if (isOccupied(x, z)) {
      return "#ffffff"; // White/invisible for occupied (no need to show under pontoons)
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
      return 0.0; // Invisible for occupied cells
    }
    if (hovered) {
      return 0.6; // Show on hover
    }
    return 0.0; // Hide grid cells by default - only show cross markers
  }, [isOccupied]);

  // Create corner cross markers geometry
  const cornerCrosses = React.useMemo(() => {
    const vertices = [];
    const crossSize = 0.15; // Size of each cross
    
    // Create small cross markers at grid intersections  
    for (let x = -5.5; x <= 4.5; x++) {
      for (let z = -5.5; z <= 4.5; z++) {
        const actualX = x * gridSpacing;
        const actualZ = z * gridSpacing;
        const y = currentLevel * levelHeight + 0.01;
        
        // Horizontal line of cross
        vertices.push(
          actualX - crossSize, y, actualZ,
          actualX + crossSize, y, actualZ
        );
        
        // Vertical line of cross
        vertices.push(
          actualX, y, actualZ - crossSize,
          actualX, y, actualZ + crossSize
        );
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }, [currentLevel, levelHeight, gridSpacing]);

  // Create a grid with smaller spacing for real pontoon dimensions
  const gridCells = [];
  for (let x = -5; x < 5; x++) {
    for (let z = -5; z < 5; z++) {
      gridCells.push(
        <GridCellSimple
          key={`${x},${z}`}
          gridX={x}
          gridZ={z}
          position={[x * gridSpacing, currentLevel * levelHeight, z * gridSpacing]}
          onClick={() => handleCellClick(x, z)}
          getCellColor={getCellColor}
          getCellOpacity={getCellOpacity}
          selectedTool={selectedTool}
          canPlace={canPlace}
          isOccupied={isOccupied}
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
function GridCellSimple({ 
  gridX, 
  gridZ, 
  position, 
  onClick, 
  getCellColor, 
  getCellOpacity, 
  selectedTool, 
  canPlace, 
  isOccupied 
}) {
  const [hovered, setHovered] = React.useState(false);

  // Check if this cell can show double pontoon preview
  const canShowDoublePreview = selectedTool === TOOLS.DOUBLE_PONTOON && 
                              hovered && 
                              gridX < 4 && // Not at right edge
                              canPlace(gridX, gridZ) && 
                              canPlace(gridX + 1, gridZ) && // Second cell is also valid
                              !isOccupied(gridX + 1, gridZ); // Second cell not occupied

  return (
    <>
      {/* Main cell */}
      <mesh
        position={position}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <boxGeometry args={[0.5, 0.05, 0.5]} />
        <meshBasicMaterial
          color={getCellColor(gridX, gridZ, hovered)}
          transparent={true}
          opacity={getCellOpacity(gridX, gridZ, hovered)}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Double pontoon preview - second cell */}
      {canShowDoublePreview && (
        <mesh position={[position[0] + 0.5, position[1], position[2]]}>
          <boxGeometry args={[0.5, 0.05, 0.5]} />
          <meshBasicMaterial
            color={getCellColor(gridX, gridZ, hovered)}
            transparent={true}
            opacity={getCellOpacity(gridX, gridZ, hovered)}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </>
  );
}

export default memo(SimpleGridSystem);