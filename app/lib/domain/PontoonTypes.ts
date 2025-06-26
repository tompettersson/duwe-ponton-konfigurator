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
    displayName: 'Single Pontoon'
  },
  [PontoonType.DOUBLE]: {
    type: PontoonType.DOUBLE,
    dimensions: PhysicalDimensions.DOUBLE_PONTOON,
    gridSize: { x: 2, y: 1, z: 1 },
    displayName: 'Double Pontoon'
  }
};

/**
 * Pontoon color configurations
 */
export const PONTOON_COLOR_CONFIGS: Record<PontoonColor, { hex: string; name: string }> = {
  [PontoonColor.BLUE]: { hex: '#6183c2', name: 'Blue' },
  [PontoonColor.BLACK]: { hex: '#111111', name: 'Black' },
  [PontoonColor.GREY]: { hex: '#e3e4e5', name: 'Grey' },
  [PontoonColor.YELLOW]: { hex: '#f7e295', name: 'Yellow' }
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