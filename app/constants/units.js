// Unit-Based Coordinate System - Clean Architecture Foundation
// Every element in the system is aware of its exact dimensions

// BASE UNIT: Single Pontoon defines all system dimensions
export const BASE_UNIT = {
  width: 0.5,   // meters (X-axis)
  height: 0.4,  // meters (Y-axis)
  depth: 0.5    // meters (Z-axis)
};

// GRID SYSTEM: Grid cells match exactly with base unit
export const GRID_CELL_SIZE = BASE_UNIT;

// PONTOON ELEMENT DEFINITIONS
export const PONTOON_TYPES = {
  single: {
    gridSize: { width: 1, depth: 1 },           // 1x1 grid cells
    physicalSize: { 
      width: BASE_UNIT.width, 
      height: BASE_UNIT.height, 
      depth: BASE_UNIT.depth 
    }
  },
  double: {
    gridSize: { width: 2, depth: 1 },           // 2x1 grid cells
    physicalSize: { 
      width: BASE_UNIT.width * 2, 
      height: BASE_UNIT.height, 
      depth: BASE_UNIT.depth 
    }
  }
};

// COORDINATE CONVERSION: Perfect mathematical alignment
export function gridToWorld(gridX, gridZ, level = 0) {
  return {
    x: gridX * BASE_UNIT.width,
    y: level * BASE_UNIT.height,  // Stack levels vertically
    z: gridZ * BASE_UNIT.depth
  };
}

export function worldToGrid(worldX, worldZ) {
  return {
    x: Math.round(worldX / BASE_UNIT.width),
    z: Math.round(worldZ / BASE_UNIT.depth)
  };
}

// CONNECTION POINTS: Mathematical calculation (no trial-and-error)
export function getConnectionPoints(pontoonType, gridX, gridZ) {
  const type = PONTOON_TYPES[pontoonType];
  const worldPos = gridToWorld(gridX, gridZ);
  
  const points = [];
  
  // Corners of the pontoon area (where connectors attach)
  for (let x = 0; x <= type.gridSize.width; x++) {
    for (let z = 0; z <= type.gridSize.depth; z++) {
      points.push({
        x: worldPos.x + (x * BASE_UNIT.width) - (type.physicalSize.width / 2),
        y: worldPos.y,
        z: worldPos.z + (z * BASE_UNIT.depth) - (type.physicalSize.depth / 2)
      });
    }
  }
  
  return points;
}

// GRID BOUNDS: Define working area
export const GRID_BOUNDS = {
  minX: -20,
  maxX: 20,
  minZ: -20,
  maxZ: 20,
  minLevel: -1,
  maxLevel: 2
};