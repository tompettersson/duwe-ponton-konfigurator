/**
 * GridMathematics - Mathematically Precise Grid Coordinate System
 * 
 * Provides exact coordinate transformations between world space and grid space
 * All calculations performed in millimeters for absolute precision
 */

import * as THREE from 'three';
import { GRID_CONSTANTS } from '../constants';
import { metersToMM, mmToMeters, snapToGrid } from '../utils/precision';
import type { GridPosition } from '../../types';

export class GridMathematics {
  private readonly cellSizeMM: number;
  private readonly precision: number;

  constructor(cellSizeMM: number = GRID_CONSTANTS.CELL_SIZE_MM) {
    this.cellSizeMM = cellSizeMM;
    this.precision = GRID_CONSTANTS.PRECISION_FACTOR;
  }

  /**
   * Convert world position (THREE.Vector3 in meters) to grid coordinates
   * Returns integer grid position for exact cell addressing
   */
  worldToGrid(worldPos: THREE.Vector3): GridPosition {
    // Convert to millimeters for precision
    const xMM = metersToMM(worldPos.x);
    const yMM = metersToMM(worldPos.y);
    const zMM = metersToMM(worldPos.z);

    // Calculate grid coordinates (integer division)
    return {
      x: Math.floor(xMM / this.cellSizeMM),
      y: Math.floor(yMM / this.cellSizeMM),
      z: Math.floor(zMM / this.cellSizeMM),
    };
  }

  /**
   * Convert grid coordinates to world position (THREE.Vector3 in meters)
   * Returns exact center position of the grid cell
   */
  gridToWorld(gridPos: GridPosition): THREE.Vector3 {
    // Calculate millimeter coordinates (cell center)
    const xMM = gridPos.x * this.cellSizeMM + this.cellSizeMM / 2;
    const yMM = gridPos.y * this.cellSizeMM + this.cellSizeMM / 2;
    const zMM = gridPos.z * this.cellSizeMM + this.cellSizeMM / 2;

    // Convert to meters
    return new THREE.Vector3(
      mmToMeters(xMM),
      mmToMeters(yMM),
      mmToMeters(zMM)
    );
  }

  /**
   * Snap world position to nearest grid center
   * Ensures exact grid alignment for pontoon placement
   */
  snapToGrid(worldPos: THREE.Vector3): THREE.Vector3 {
    const gridPos = this.worldToGrid(worldPos);
    return this.gridToWorld(gridPos);
  }

  /**
   * Generate unique string key for grid position
   * Used for spatial hash indexing
   */
  getGridKey(gridPos: GridPosition): string {
    return `${gridPos.x},${gridPos.y},${gridPos.z}`;
  }

  /**
   * Parse grid key back to position
   * Inverse of getGridKey()
   */
  parseGridKey(key: string): GridPosition {
    const [x, y, z] = key.split(',').map(Number);
    return { x, y, z };
  }

  /**
   * Calculate distance between two grid positions
   * Returns distance in grid cells (not meters)
   */
  gridDistance(pos1: GridPosition, pos2: GridPosition): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Check if grid position is within bounds
   */
  isInBounds(gridPos: GridPosition, gridSize: { width: number; height: number }): boolean {
    return (
      gridPos.x >= 0 &&
      gridPos.x < gridSize.width &&
      gridPos.z >= 0 &&
      gridPos.z < gridSize.height
    );
  }

  /**
   * Get all grid positions in a rectangular area
   */
  getGridPositionsInArea(
    min: GridPosition,
    max: GridPosition
  ): GridPosition[] {
    const positions: GridPosition[] = [];

    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        for (let z = min.z; z <= max.z; z++) {
          positions.push({ x, y, z });
        }
      }
    }

    return positions;
  }

  /**
   * Get neighboring grid positions (6-connected)
   */
  getNeighbors(gridPos: GridPosition): GridPosition[] {
    return [
      { x: gridPos.x + 1, y: gridPos.y, z: gridPos.z },
      { x: gridPos.x - 1, y: gridPos.y, z: gridPos.z },
      { x: gridPos.x, y: gridPos.y + 1, z: gridPos.z },
      { x: gridPos.x, y: gridPos.y - 1, z: gridPos.z },
      { x: gridPos.x, y: gridPos.y, z: gridPos.z + 1 },
      { x: gridPos.x, y: gridPos.y, z: gridPos.z - 1 },
    ];
  }

  /**
   * Calculate bounding box for a set of grid positions
   */
  getBoundingBox(positions: GridPosition[]): {
    min: GridPosition;
    max: GridPosition;
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

  /**
   * Get cell size in meters
   */
  getCellSizeMeters(): number {
    return mmToMeters(this.cellSizeMM);
  }

  /**
   * Get cell size in millimeters
   */
  getCellSizeMM(): number {
    return this.cellSizeMM;
  }

  /**
   * Convert rotation angle to grid rotation steps
   * 0° = 0, 90° = 1, 180° = 2, 270° = 3
   */
  angleToRotationSteps(angle: number): number {
    return Math.round(((angle % 360) + 360) % 360 / 90) % 4;
  }

  /**
   * Convert rotation steps to angle
   */
  rotationStepsToAngle(steps: number): number {
    return (steps * 90) % 360;
  }
}