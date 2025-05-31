/**
 * Mathematical Constants for Precision Pontoon Configurator
 * 
 * All measurements in millimeters for absolute precision
 * No approximations or floating point errors
 */

export const GRID_CONSTANTS = {
  // Grid Dimensions (in millimeters)
  CELL_SIZE_MM: 400, // 0.4m single pontoon size
  PONTOON_HEIGHT_MM: 500, // 0.5m standard height
  GRID_SIZE: 50, // Default grid size (50x50 = 2500 cells max)
  
  // Precision & Math
  PRECISION_FACTOR: 1000, // Convert meters to millimeters
  EPSILON: 0.001, // For floating point comparisons
  
  // Performance
  MAX_INSTANCES: 10000, // Maximum pontoons for instanced rendering
  SPATIAL_HASH_CELL_SIZE: 400, // Match grid cell size for optimal performance
} as const;

export const LAYERS = {
  GRID: 0,
  PONTOONS: 1,
  HOVER: 2,
  UI: 3,
} as const;

export const COLORS = {
  // Grid
  GRID_LINE: '#888888',
  GRID_BACKGROUND: '#e0e0e0',
  
  // Hover & Selection
  HOVER_VALID: '#00ff00',
  HOVER_INVALID: '#ff0000',
  SELECTION_OUTLINE: '#ffff00',
  
  // Pontoons
  PONTOON_DEFAULT: '#4a90e2',
  PONTOON_SELECTED: '#ff6b35',
  
  // UI
  BACKGROUND: '#f0f0f0',
  SURFACE: '#ffffff',
} as const;

export const CAMERA_POSITIONS = {
  '2D': {
    position: [0, 30, 0] as const,
    target: [0, 0, 0] as const,
  },
  '3D': {
    position: [15, 15, 15] as const,
    target: [0, 0, 0] as const,
  },
} as const;

// Validation Constants
export const VALIDATION = {
  MIN_GRID_SIZE: 5,
  MAX_GRID_SIZE: 1000,
  MAX_PONTOONS: 100000,
  MIN_PONTOON_ID_LENGTH: 8,
} as const;

// Performance Thresholds
export const PERFORMANCE = {
  LOD_DISTANCE_NEAR: 50, // Full detail
  LOD_DISTANCE_FAR: 200, // Simplified rendering
  CULLING_DISTANCE: 500, // Don't render beyond this
  TARGET_FPS: 60,
  MIN_FPS: 30,
} as const;

// Input Constants
export const INPUT = {
  DOUBLE_CLICK_TIME: 300, // milliseconds
  DRAG_THRESHOLD: 5, // pixels
  ZOOM_SPEED: 0.1,
  PAN_SPEED: 1.0,
  ROTATE_SPEED: 1.0,
} as const;