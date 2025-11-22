/**
 * PontoonTypes - Domain Types for Pontoon System
 * 
 * Defines all pontoon-related types and enums for the domain
 */

import { PhysicalDimensions } from './PhysicalDimensions';
import { GridPosition } from './GridPosition';

/**
 * Pontoon Type Enumeration
 */
export enum PontoonType {
  SINGLE = 'single',  // 500mm x 400mm x 500mm
  DOUBLE = 'double'   // 1000mm x 400mm x 500mm
}

/**
 * Pontoon Color Enumeration
 */
export enum PontoonColor {
  BLUE = 'blue',     // #6183c2
  BLACK = 'black',   // #111111
  GREY = 'grey',     // #e3e4e5
  YELLOW = 'yellow'  // #f7e295
}

/**
 * Pontoon Rotation (for future expansion)
 */
export enum Rotation {
  NORTH = 0,   // 0 degrees
  EAST = 90,   // 90 degrees
  SOUTH = 180, // 180 degrees
  WEST = 270   // 270 degrees
}

/**
 * Unique identifier for pontoons
 */
export type PontoonId = string;

/**
 * Grid offset for relative positioning
 */
export interface GridOffset {
  x: number;
  y: number;
  z: number;
}

/**
 * Physical position in 3D space (meters)
 */
export interface PhysicalPosition {
  x: number; // X coordinate in meters
  y: number; // Y coordinate in meters
  z: number; // Z coordinate in meters
}

/**
 * World position in Three.js coordinate system
 */
export interface WorldPosition {
  x: number; // X coordinate in Three.js world
  y: number; // Y coordinate in Three.js world
  z: number; // Z coordinate in Three.js world
}

/**
 * Screen position in UI coordinates
 */
export interface ScreenPosition {
  x: number; // Screen X coordinate
  y: number; // Screen Y coordinate
}

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error with specific type and context
 */
export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  position?: GridPosition;
  details?: any;
}

/**
 * Types of validation errors
 */
export enum ValidationErrorType {
  OUT_OF_BOUNDS = 'OUT_OF_BOUNDS',
  CELL_OCCUPIED = 'CELL_OCCUPIED', 
  NO_SUPPORT = 'NO_SUPPORT',
  INVALID_TYPE = 'INVALID_TYPE',
  INVALID_POSITION = 'INVALID_POSITION'
}

/**
 * Grid dimensions specification
 */
export interface GridDimensions {
  width: number;  // Number of cells in X direction
  height: number; // Number of cells in Z direction
  levels: number; // Number of levels (Y direction)
}

/**
 * Pontoon type configuration
 */
export interface PontoonTypeConfig {
  type: PontoonType;
  dimensions: PhysicalDimensions;
  gridSize: GridOffset; // How many grid cells it occupies
  displayName: string;
}

/**
 * Pontoon type configurations
 */
export const PONTOON_TYPE_CONFIGS: Record<PontoonType, PontoonTypeConfig> = {
  [PontoonType.SINGLE]: {
    type: PontoonType.SINGLE,
    dimensions: PhysicalDimensions.SINGLE_PONTOON,
    gridSize: { x: 1, y: 1, z: 1 },
    displayName: 'Einzelelement'
  },
  [PontoonType.DOUBLE]: {
    type: PontoonType.DOUBLE,
    dimensions: PhysicalDimensions.DOUBLE_PONTOON,
    gridSize: { x: 2, y: 1, z: 1 },
    displayName: 'Doppelelement'
  }
};

/**
 * Lug (Lasche) Layer Definition
 * 1 = Bottom-most
 * 4 = Top-most
 * 2, 3 = Middle layers
 */
export type LugLayer = 1 | 2 | 3 | 4;

/**
 * Configuration for a single lug at a specific corner
 */
export interface LugDefinition {
  layer: LugLayer;
}

/**
 * Map of local corner coordinates to lug definitions
 * Key format: "x,z" where x,z are local grid offsets (0 or 1 for single)
 */
export type LugConfig = Record<string, LugDefinition>;

/**
 * Lug configurations for each pontoon type (Rotation: NORTH)
 * Based on standard JetFloat/FloatCube patterns:
 * - Side A: Layers 1 & 4
 * - Side B: Layers 2 & 3
 */
export const PONTOON_LUG_CONFIGS: Record<PontoonType, LugConfig> = {
  [PontoonType.SINGLE]: {
    // Heights from pre-aligned OBJ model (Ponton_single_aligned.obj)
    // Model is pre-rotated, so OBJ coordinates = World coordinates
    // Peak heights (analysis: scripts/analyze-single-pontoon.ts):
    // NW (1,0): 280mm → Layer 4
    // SW (0,0): 264mm → Layer 3
    // SE (0,1): 248mm → Layer 2
    // NE (1,1): 232mm → Layer 1
    
    // West Side (Z=0)
    '0,0': { layer: 3 }, // SW: 264mm
    '1,0': { layer: 4 }, // NW: 280mm
    
    // East Side (Z=1)
    '0,1': { layer: 2 }, // SE: 248mm
    '1,1': { layer: 1 }  // NE: 232mm
  },
  [PontoonType.DOUBLE]: {
    // 2x1 Pontoon
    // Heights extracted from OBJ model analysis (scripts/analyze-pontoon-lugs.ts):
    // NW: 266mm → Layer 4
    // W: 266mm → Layer 4
    // SW: 250mm → Layer 3
    // SO: 234mm → Layer 2
    // O: 216.5mm → Layer 1
    // NO: 216.5mm → Layer 1
    
    // West Side (Z=0)
    '0,0': { layer: 3 }, // SW: 250mm
    '1,0': { layer: 4 }, // W: 266mm
    '2,0': { layer: 4 }, // NW: 266mm
    
    // East Side (Z=1)
    '0,1': { layer: 2 }, // SO: 234mm
    '1,1': { layer: 1 }, // O: 216.5mm
    '2,1': { layer: 1 }  // NO: 216.5mm
  }
};

/**
 * Pontoon color configurations
 */
export const PONTOON_COLOR_CONFIGS: Record<PontoonColor, { hex: string; name: string }> = {
  [PontoonColor.BLUE]: { hex: '#6183c2', name: 'Blau' },
  // Adjusted from #111111 to #333333 to reduce darkness
  [PontoonColor.BLACK]: { hex: '#333333', name: 'Schwarz' },
  [PontoonColor.GREY]: { hex: '#e3e4e5', name: 'Grau' },
  [PontoonColor.YELLOW]: { hex: '#f7e295', name: 'Sand' }
};

/**
 * Get pontoon type configuration
 */
export function getPontoonTypeConfig(type: PontoonType): PontoonTypeConfig {
  return PONTOON_TYPE_CONFIGS[type];
}

/**
 * Get pontoon color configuration
 */
export function getPontoonColorConfig(color: PontoonColor): { hex: string; name: string } {
  return PONTOON_COLOR_CONFIGS[color];
}

/**
 * Check if pontoon type is valid
 */
export function isValidPontoonType(type: string): type is PontoonType {
  return Object.values(PontoonType).includes(type as PontoonType);
}

/**
 * Check if pontoon color is valid
 */
export function isValidPontoonColor(color: string): color is PontoonColor {
  return Object.values(PontoonColor).includes(color as PontoonColor);
}
