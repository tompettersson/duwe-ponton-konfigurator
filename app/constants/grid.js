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
  { id: 2, name: "Ebene 2" },
  { id: 1, name: "Ebene 1" },
  { id: 0, name: "Grundebene" },
  { id: -1, name: "Unterwasser" },
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

// Pontoon color options
export const PONTOON_COLORS = {
  BLUE: "#5578B7",
  BLACK: "#111111", 
  GREY: "#DFE0E1",
  YELLOW: "#F6DE91",
};

export const PONTOON_COLOR_NAMES = {
  [PONTOON_COLORS.BLUE]: "Blau",
  [PONTOON_COLORS.BLACK]: "Schwarz",
  [PONTOON_COLORS.GREY]: "Grau", 
  [PONTOON_COLORS.YELLOW]: "Gelb",
};
