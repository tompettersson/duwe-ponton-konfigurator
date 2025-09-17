/**
 * CoordinateCalculator - Single Source of Truth for Coordinate Transformations
 * 
 * Stateless service providing all coordinate conversion methods
 * Eliminates dual coordinate system issues identified in the analysis
 */

import * as THREE from 'three';
import { GridPosition } from './GridPosition';
import { PhysicalDimensions } from './PhysicalDimensions';
import { 
  ScreenPosition, 
  PhysicalPosition, 
  WorldPosition, 
  GridDimensions 
} from './PontoonTypes';

export class CoordinateCalculator {
  private readonly CELL_SIZE_MM = 500;      // 0.5m grid cells
  private readonly PONTOON_HEIGHT_MM = 400; // 0.4m pontoon height
  private readonly PRECISION_FACTOR = 1000; // MM to M conversion

  // Memoization cache for performance
  private readonly memoCache = new Map<string, any>();

  /**
   * SINGLE method for screen to grid conversion
   * Eliminates coordinate system inconsistencies
   */
  screenToGrid(
    screenPos: ScreenPosition,
    camera: THREE.Camera,
    viewport: { width: number; height: number },
    gridDimensions: GridDimensions,
    currentLevel: number
  ): GridPosition | null {
    const cacheKey = this.createCacheKey('screenToGrid', screenPos, currentLevel);
    
    if (this.memoCache.has(cacheKey)) {
      return this.memoCache.get(cacheKey);
    }

    try {
      // 1. Screen to normalized device coordinates
      const ndc = this.screenToNDC(screenPos, viewport);
      
      // 2. NDC to world coordinates via raycast
      const worldPos = this.raycastToLevel(ndc, camera, currentLevel);
      
      if (!worldPos) {
        this.memoCache.set(cacheKey, null);
        return null;
      }
      
      // 3. World to grid coordinates
      const gridPos = this.worldToGrid(worldPos, gridDimensions, currentLevel);
      
      this.memoCache.set(cacheKey, gridPos);
      return gridPos;
    } catch (error) {
      console.warn('CoordinateCalculator.screenToGrid failed:', error);
      this.memoCache.set(cacheKey, null);
      return null;
    }
  }

  /**
   * Convert grid position to physical position (millimeters)
   */
  gridToPhysical(
    gridPos: GridPosition,
    gridDimensions: GridDimensions
  ): PhysicalPosition {
    const cacheKey = this.createCacheKey('gridToPhysical', gridPos);
    
    if (this.memoCache.has(cacheKey)) {
      return this.memoCache.get(cacheKey);
    }

    // Calculate grid center in millimeters
    const gridCenterX = (gridDimensions.width * this.CELL_SIZE_MM) / 2;
    const gridCenterZ = (gridDimensions.height * this.CELL_SIZE_MM) / 2;

    // Convert grid coordinates to physical coordinates
    const physicalPos: PhysicalPosition = {
      x: (gridPos.x * this.CELL_SIZE_MM) - gridCenterX + (this.CELL_SIZE_MM / 2),
      y: this.getLevelPhysicalY(gridPos.y),
      z: (gridPos.z * this.CELL_SIZE_MM) - gridCenterZ + (this.CELL_SIZE_MM / 2)
    };

    this.memoCache.set(cacheKey, physicalPos);
    return physicalPos;
  }

  /**
   * Convert grid position to Three.js world coordinates (meters)
   */
  gridToWorld(
    gridPos: GridPosition,
    gridDimensions: GridDimensions
  ): WorldPosition {
    const physicalPos = this.gridToPhysical(gridPos, gridDimensions);
    
    // Convert millimeters to meters for Three.js
    return {
      x: physicalPos.x / this.PRECISION_FACTOR,
      y: physicalPos.y / this.PRECISION_FACTOR,
      z: physicalPos.z / this.PRECISION_FACTOR
    };
  }

  /**
   * Convert grid intersection (cell corner) to world position.
   * Intersections are expressed in cell coordinates [0..width] / [0..height].
   */
  gridIntersectionToWorld(
    intersection: { x: number; z: number },
    level: number,
    gridDimensions: GridDimensions
  ): WorldPosition {
    const halfGridWidthMM = (gridDimensions.width * this.CELL_SIZE_MM) / 2;
    const halfGridHeightMM = (gridDimensions.height * this.CELL_SIZE_MM) / 2;

    const xMM = intersection.x * this.CELL_SIZE_MM - halfGridWidthMM;
    const zMM = intersection.z * this.CELL_SIZE_MM - halfGridHeightMM;
    const yMeters = this.getLevelPhysicalY(level) / this.PRECISION_FACTOR;

    return {
      x: xMM / this.PRECISION_FACTOR,
      y: yMeters,
      z: zMM / this.PRECISION_FACTOR
    };
  }

  /**
   * Convert world position to grid position
   * SINGLE implementation - eliminates dual Y-coordinate systems
   */
  private worldToGrid(
    worldPos: WorldPosition,
    gridDimensions: GridDimensions,
    currentLevel: number
  ): GridPosition {
    // Calculate grid center in meters
    const gridCenterX = (gridDimensions.width * this.CELL_SIZE_MM / 2) / this.PRECISION_FACTOR;
    const gridCenterZ = (gridDimensions.height * this.CELL_SIZE_MM / 2) / this.PRECISION_FACTOR;
    
    // Cell size in meters
    const cellSizeM = this.CELL_SIZE_MM / this.PRECISION_FACTOR;

    // Calculate grid coordinates with consistent precision
    const x = Math.floor((worldPos.x + gridCenterX) / cellSizeM);
    const z = Math.floor((worldPos.z + gridCenterZ) / cellSizeM);
    
    // CRITICAL FIX: Always use currentLevel (eliminates Y-coordinate inconsistency)
    return new GridPosition(x, currentLevel, z);
  }

  /**
   * Convert screen coordinates to normalized device coordinates
   */
  private screenToNDC(
    screenPos: ScreenPosition,
    viewport: { width: number; height: number }
  ): THREE.Vector2 {
    return new THREE.Vector2(
      (screenPos.x / viewport.width) * 2 - 1,
      -(screenPos.y / viewport.height) * 2 + 1
    );
  }

  /**
   * Raycast from NDC to specific level plane
   */
  private raycastToLevel(
    ndc: THREE.Vector2,
    camera: THREE.Camera,
    level: number
  ): WorldPosition | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);

    // Create plane at the current level
    const levelY = this.getLevelPhysicalY(level) / this.PRECISION_FACTOR;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -levelY);

    // Calculate intersection
    const intersectionPoint = new THREE.Vector3();
    const intersection = raycaster.ray.intersectPlane(plane, intersectionPoint);

    if (!intersection) {
      return null;
    }

    return {
      x: intersection.x,
      y: intersection.y,
      z: intersection.z
    };
  }

  /**
   * Get physical Y coordinate for level
   */
  getLevelPhysicalY(level: number): number {
    return level * this.PONTOON_HEIGHT_MM; // In millimeters
  }

  /**
   * Check if grid position is within bounds
   */
  isInBounds(
    gridPos: GridPosition,
    gridDimensions: GridDimensions
  ): boolean {
    return gridPos.x >= 0 && 
           gridPos.x < gridDimensions.width &&
           gridPos.y >= 0 && 
           gridPos.y < gridDimensions.levels &&
           gridPos.z >= 0 && 
           gridPos.z < gridDimensions.height;
  }

  /**
   * Check if grid position with size fits within bounds
   */
  isInBoundsWithSize(
    gridPos: GridPosition,
    gridSize: { x: number; y: number; z: number },
    gridDimensions: GridDimensions
  ): boolean {
    return this.isInBounds(gridPos, gridDimensions) &&
           gridPos.x + gridSize.x <= gridDimensions.width &&
           gridPos.y + gridSize.y <= gridDimensions.levels &&
           gridPos.z + gridSize.z <= gridDimensions.height;
  }

  /**
   * Calculate distance between two grid positions
   */
  gridDistance(pos1: GridPosition, pos2: GridPosition): number {
    return pos1.distanceTo(pos2);
  }

  /**
   * Calculate physical distance between two grid positions
   */
  physicalDistance(
    pos1: GridPosition,
    pos2: GridPosition,
    gridDimensions: GridDimensions
  ): number {
    const phys1 = this.gridToPhysical(pos1, gridDimensions);
    const phys2 = this.gridToPhysical(pos2, gridDimensions);

    return Math.sqrt(
      Math.pow(phys1.x - phys2.x, 2) +
      Math.pow(phys1.y - phys2.y, 2) +
      Math.pow(phys1.z - phys2.z, 2)
    );
  }

  /**
   * Get grid positions in rectangular area
   */
  getGridPositionsInArea(
    start: GridPosition,
    end: GridPosition
  ): GridPosition[] {
    return GridPosition.getRectangularArea(start, end);
  }

  /**
   * Get grid key for position (for maps and caching)
   */
  getGridKey(position: GridPosition): string {
    return position.toString();
  }

  /**
   * Clear memoization cache
   */
  clearCache(): void {
    this.memoCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; memoryUsage: number } {
    const size = this.memoCache.size;
    const memoryUsage = size * 64; // Rough estimation
    
    return { size, memoryUsage };
  }

  /**
   * Create cache key for memoization
   */
  private createCacheKey(method: string, ...args: any[]): string {
    const serializedArgs = args.map(arg => {
      if (arg && typeof arg === 'object') {
        if (arg.x !== undefined && arg.y !== undefined && arg.z !== undefined) {
          return `${arg.x},${arg.y},${arg.z}`;
        }
        return JSON.stringify(arg);
      }
      return String(arg);
    }).join('|');

    return `${method}:${serializedArgs}`;
  }

  /**
   * Constants for external access
   */
  static readonly CONSTANTS = {
    CELL_SIZE_MM: 500,
    PONTOON_HEIGHT_MM: 400,
    PRECISION_FACTOR: 1000
  };
}
