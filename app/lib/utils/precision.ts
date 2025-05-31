/**
 * Precision Utilities for Mathematical Exactness
 * 
 * Ensures all calculations are performed with millimeter precision
 * Eliminates floating point errors through integer arithmetic
 */

import { GRID_CONSTANTS } from '../constants';

/**
 * Convert meters to millimeters with precision
 */
export function metersToMM(meters: number): number {
  return Math.round(meters * GRID_CONSTANTS.PRECISION_FACTOR);
}

/**
 * Convert millimeters to meters with precision
 */
export function mmToMeters(millimeters: number): number {
  return millimeters / GRID_CONSTANTS.PRECISION_FACTOR;
}

/**
 * Ensure a number is within epsilon of an integer (for snap-to-grid)
 */
export function isNearInteger(value: number, epsilon = GRID_CONSTANTS.EPSILON): boolean {
  return Math.abs(value - Math.round(value)) < epsilon;
}

/**
 * Round to nearest grid cell with mathematical precision
 */
export function snapToGrid(value: number): number {
  const cellSize = GRID_CONSTANTS.CELL_SIZE_MM;
  return Math.round(value * GRID_CONSTANTS.PRECISION_FACTOR / cellSize) * cellSize / GRID_CONSTANTS.PRECISION_FACTOR;
}

/**
 * Compare floating point numbers with epsilon tolerance
 */
export function floatEqual(a: number, b: number, epsilon = GRID_CONSTANTS.EPSILON): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generate a unique ID with timestamp and random component
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}${timestamp}-${random}`;
}

/**
 * Validate grid position is within bounds
 */
export function isValidGridPosition(
  position: { x: number; y: number; z: number },
  gridSize: { width: number; height: number }
): boolean {
  return (
    position.x >= 0 &&
    position.x < gridSize.width &&
    position.z >= 0 &&
    position.z < gridSize.height &&
    Number.isInteger(position.x) &&
    Number.isInteger(position.y) &&
    Number.isInteger(position.z)
  );
}

/**
 * Calculate distance between two grid positions
 */
export function gridDistance(
  pos1: { x: number; y: number; z: number },
  pos2: { x: number; y: number; z: number }
): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const dz = pos2.z - pos1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate bounding box for a set of positions
 */
export function calculateBoundingBox(positions: Array<{ x: number; y: number; z: number }>): {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
} {
  if (positions.length === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
    };
  }

  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };

  for (const pos of positions) {
    min.x = Math.min(min.x, pos.x);
    min.y = Math.min(min.y, pos.y);
    min.z = Math.min(min.z, pos.z);
    max.x = Math.max(max.x, pos.x);
    max.y = Math.max(max.y, pos.y);
    max.z = Math.max(max.z, pos.z);
  }

  return { min, max };
}