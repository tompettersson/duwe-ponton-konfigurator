/**
 * Grid related constants for the pontoon configurator
 */

// Default grid dimensions
export const DEFAULT_GRID_SIZE = {
  width: 40,
  depth: 30,
  height: 1,
};

// Height between levels
export const LEVEL_HEIGHT = 1;

// Water level position
export const WATER_LEVEL = 0;

// Available levels in the configurator
export const LEVELS = [
  { id: 2, name: "Level 2" },
  { id: 1, name: "Level 1" },
  { id: 0, name: "Ground Level" },
  { id: -1, name: "Underwater" },
];

// Tool types
export const TOOLS = {
  SINGLE_PONTOON: "single",
  DOUBLE_PONTOON: "double",
  DELETE_TOOL: "eraser",
  ERASER: "eraser",
};

// Element types
export const ELEMENT_TYPES = {
  SINGLE: "single",
  DOUBLE: "double",
};

// Colors
export const COLORS = {
  PONTOON: "#6D9FFF",
  WATER: "#76b6c4",
  SKY: "#C7E8FF",
  GRID: "#ffffff",
};
