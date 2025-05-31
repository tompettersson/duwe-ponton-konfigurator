"use client";

import React, { memo, useCallback } from "react";
import * as THREE from "three";
import { TOOLS } from "../../constants/grid";
import { BASE_UNIT, gridToWorld, worldToGrid, GRID_BOUNDS } from "../../constants/units.js";
import { PontoonElement } from "../../utils/PontoonElement.js";

/**
 * Unit-Based Grid System - Perfect alignment with pontoon dimensions
 * Grid cells = exactly Single Pontoon size (0.5m x 0.5m)
 * All coordinates are mathematical, no trial-and-error offsets
 */
function SimpleGridSystem({ 
  onCellClick, 
  selectedTool, 
  elements = [], 
  currentLevel, 
  levelHeight 
}) {
  
  const [hoverPosition, setHoverPosition] = React.useState(null);
  
  const handleCellHover = React.useCallback((gridX, gridZ) => {
    setHoverPosition({ gridX, gridZ, level: currentLevel });
  }, [currentLevel]);

  const handleCellHoverEnd = React.useCallback(() => {
    setHoverPosition(null);
  }, []);
  
  // Grid spacing = Single Pontoon size (BASE_UNIT dimensions)
  const gridSpacing = BASE_UNIT.width; // 0.5m spacing (exact pontoon size)
  
  // Convert legacy elements to PontoonElement format for consistent collision detection
  const normalizedElements = React.useMemo(() => {
    return elements.map(element => {
      if (element instanceof PontoonElement) {
        return element;
      }
      
      // Convert legacy element format
      const gridPos = worldToGrid(element.position.x, element.position.z);
      const type = element.type === 'DOUBLE' ? 'double' : 'single';
      
      return new PontoonElement(
        type,
        gridPos.x,
        gridPos.z,
        element.level || 0,
        element.color || 'blue'
      );
    });
  }, [elements]);

  const isOccupied = useCallback((gridX, gridZ) => {
    return normalizedElements.some(element => 
      element.level === currentLevel && element.occupiesCell(gridX, gridZ)
    );
  }, [normalizedElements, currentLevel]);

  const hasSupport = useCallback((gridX, gridZ) => {
    // Ground level and underwater always have support
    if (currentLevel <= 0) return true;
    
    // Check if there's a pontoon directly below this grid cell
    return normalizedElements.some(element => 
      element.level === currentLevel - 1 && element.occupiesCell(gridX, gridZ)
    );
  }, [normalizedElements, currentLevel]);

  const canPlace = useCallback((x, z) => {
    if (isOccupied(x, z)) return false;
    return hasSupport(x, z);
  }, [isOccupied, hasSupport]);

  const handleCellClick = useCallback((clickData) => {
    // Forward the click data to parent component
    onCellClick(clickData);
  }, [onCellClick]);

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

  // Create point markers at grid intersections (connection points)
  const connectionPoints = React.useMemo(() => {
    const points = [];
    
    // Create points at grid intersections - these mark connection points
    for (let x = GRID_BOUNDS.minX; x <= GRID_BOUNDS.maxX + 1; x++) {
      for (let z = GRID_BOUNDS.minZ; z <= GRID_BOUNDS.maxZ + 1; z++) {
        const worldPos = gridToWorld(x - 0.5, z - 0.5, currentLevel);
        points.push({
          position: [worldPos.x, worldPos.y + 0.02, worldPos.z],
          gridX: x - 0.5,
          gridZ: z - 0.5
        });
      }
    }
    
    return points;
  }, [currentLevel]);

  // Create invisible interactive grid cells for hover detection
  const gridCells = [];
  for (let x = GRID_BOUNDS.minX; x <= GRID_BOUNDS.maxX; x++) {
    for (let z = GRID_BOUNDS.minZ; z <= GRID_BOUNDS.maxZ; z++) {
      const worldPos = gridToWorld(x, z, currentLevel);
      
      gridCells.push(
        <InvisibleGridCell
          key={`${x},${z},${currentLevel}`}
          gridX={x}
          gridZ={z}
          position={[worldPos.x, worldPos.y, worldPos.z]}
          onHover={(isHovered) => {
            if (isHovered) {
              handleCellHover(x, z);
            } else {
              handleCellHoverEnd();
            }
          }}
          onClick={() => {
            const clickData = {
              gridX: x,
              gridZ: z,
              level: currentLevel,
              worldPosition: worldPos
            };
            handleCellClick(clickData);
          }}
        />
      );
    }
  }

  return (
    <>
      {/* Three.js Grid Helper for better visual reference */}
      <primitive 
        object={new THREE.GridHelper(
          (GRID_BOUNDS.maxX - GRID_BOUNDS.minX + 1) * BASE_UNIT.width, // size
          (GRID_BOUNDS.maxX - GRID_BOUNDS.minX + 1), // divisions
          "#cccccc", // center line color
          "#eeeeee"  // grid color
        )}
        position={[0, currentLevel * BASE_UNIT.height + 0.001, 0]}
      />
      
      {/* Connection Point Markers - Visual only, no interaction */}
      {connectionPoints.map((point, index) => (
        <mesh key={`${index}-${currentLevel}`} position={point.position}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial 
            color="#666666" 
            transparent 
            opacity={0.6}
            toneMapped={false}
          />
        </mesh>
      ))}
      
      {/* Interactive Grid Cells - exactly pontoon-sized */}
      {gridCells}
      
      {/* Hover Preview - Show pontoon preview when hovering over grid cells */}
      {hoverPosition && selectedTool === TOOLS.SINGLE_PONTOON && (
        <HoverPreview
          gridX={hoverPosition.gridX}
          gridZ={hoverPosition.gridZ}
          level={hoverPosition.level}
          tool={selectedTool}
        />
      )}
    </>
  );
}

/**
 * Invisible Grid Cell - Full pontoon-sized interaction area
 */
function InvisibleGridCell({ 
  gridX, 
  gridZ, 
  position, 
  onHover,
  onClick
}) {
  const [hovered, setHovered] = React.useState(false);

  const handlePointerOver = React.useCallback((e) => {
    e.stopPropagation();
    setHovered(true);
    onHover(true);
  }, [onHover]);

  const handlePointerOut = React.useCallback((e) => {
    e.stopPropagation();
    setHovered(false);
    onHover(false);
  }, [onHover]);

  const handleClick = React.useCallback((e) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  return (
    <mesh
      position={position}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {/* Full pontoon-sized invisible interaction box */}
      <boxGeometry args={[BASE_UNIT.width, BASE_UNIT.height, BASE_UNIT.depth]} />
      <meshBasicMaterial
        transparent={true}
        opacity={0} // Completely invisible
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}


/**
 * Hover Preview Component - Shows light blue pontoon preview
 */
function HoverPreview({ gridX, gridZ, level, tool }) {
  const previewElement = new PontoonElement(tool, gridX, gridZ, level, 'blue');
  const geometry = previewElement.getGeometry();
  
  return (
    <mesh
      position={[
        previewElement.worldPosition.x,
        previewElement.worldPosition.y,
        previewElement.worldPosition.z
      ]}
    >
      <boxGeometry 
        args={[
          geometry.width,
          geometry.height,
          geometry.depth
        ]} 
      />
      <meshBasicMaterial 
        color="#87CEEB" // Light blue preview
        transparent={true}
        opacity={0.6}
        toneMapped={false}
      />
    </mesh>
  );
}

export default memo(SimpleGridSystem);