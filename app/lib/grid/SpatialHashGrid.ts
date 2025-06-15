/**
 * SpatialHashGrid - O(1) Spatial Indexing for Collision Detection
 * 
 * Provides fast spatial queries for pontoon placement validation
 * Uses grid-aligned hashing for optimal performance
 */

import { GridMathematics } from './GridMathematics';
import { GRID_CONSTANTS } from '../constants';
import type { GridPosition, SpatialElement } from '../../types';

export class SpatialHashGrid {
  private grid: Map<string, Set<string>>;
  private elements: Map<string, SpatialElement>;
  private gridMath: GridMathematics;

  constructor(private cellSize: number = GRID_CONSTANTS.CELL_SIZE_MM) {
    this.grid = new Map();
    this.elements = new Map();
    this.gridMath = new GridMathematics(cellSize);
  }

  /**
   * Insert element into spatial hash grid
   * Supports multi-cell elements (e.g., double pontoons)
   */
  insert(
    elementId: string,
    position: GridPosition,
    size: GridPosition = { x: 1, y: 1, z: 1 }
  ): void {
    // Remove if already exists
    this.remove(elementId);

    // Calculate bounds
    const bounds = {
      x: position.x + size.x,
      y: position.y + size.y,
      z: position.z + size.z,
    };

    // Store element data
    this.elements.set(elementId, { id: elementId, position, bounds });

    // Insert into all occupied cells
    for (let x = position.x; x < bounds.x; x++) {
      for (let y = position.y; y < bounds.y; y++) {
        for (let z = position.z; z < bounds.z; z++) {
          const key = this.gridMath.getGridKey({ x, y, z });
          
          if (!this.grid.has(key)) {
            this.grid.set(key, new Set());
          }
          
          this.grid.get(key)!.add(elementId);
        }
      }
    }
  }

  /**
   * Remove element from spatial hash grid
   */
  remove(elementId: string): void {
    const element = this.elements.get(elementId);
    if (!element) return;

    const { position, bounds } = element;

    // Remove from all occupied cells
    for (let x = position.x; x < bounds.x; x++) {
      for (let y = position.y; y < bounds.y; y++) {
        for (let z = position.z; z < bounds.z; z++) {
          const key = this.gridMath.getGridKey({ x, y, z });
          const cellSet = this.grid.get(key);
          
          if (cellSet) {
            cellSet.delete(elementId);
            
            // Clean up empty cells
            if (cellSet.size === 0) {
              this.grid.delete(key);
            }
          }
        }
      }
    }

    // Remove element data
    this.elements.delete(elementId);
  }

  /**
   * Query elements in a spatial region
   * Returns all element IDs that overlap with the query area
   */
  query(
    position: GridPosition,
    size: GridPosition = { x: 1, y: 1, z: 1 }
  ): string[] {
    const results = new Set<string>();

    // Query all cells in the region
    for (let x = position.x; x < position.x + size.x; x++) {
      for (let y = position.y; y < position.y + size.y; y++) {
        for (let z = position.z; z < position.z + size.z; z++) {
          const key = this.gridMath.getGridKey({ x, y, z });
          const cellElements = this.grid.get(key);
          
          if (cellElements) {
            cellElements.forEach(id => results.add(id));
          }
        }
      }
    }

    return Array.from(results);
  }

  /**
   * Check for collision at position
   * Returns true if any element occupies the space
   */
  checkCollision(
    position: GridPosition,
    size: GridPosition = { x: 1, y: 1, z: 1 },
    excludeId?: string
  ): boolean {
    const collisions = this.query(position, size);
    
    return excludeId
      ? collisions.some(id => id !== excludeId)
      : collisions.length > 0;
  }

  /**
   * Check for collision at specific level only
   * Used for level-specific placement validation
   */
  checkCollisionAtLevel(
    position: GridPosition,
    size: GridPosition = { x: 1, y: 1, z: 1 },
    excludeId?: string
  ): boolean {
    const results = new Set<string>();

    // Only check the specific level (y-coordinate)
    for (let x = position.x; x < position.x + size.x; x++) {
      for (let z = position.z; z < position.z + size.z; z++) {
        const key = this.gridMath.getGridKey({ x, y: position.y, z });
        const cellElements = this.grid.get(key);
        
        if (cellElements) {
          cellElements.forEach(id => results.add(id));
        }
      }
    }

    const collisions = Array.from(results);
    return excludeId
      ? collisions.some(id => id !== excludeId)
      : collisions.length > 0;
  }

  /**
   * Get all elements at exact position
   */
  getElementsAtPosition(position: GridPosition): string[] {
    const key = this.gridMath.getGridKey(position);
    const cellElements = this.grid.get(key);
    return cellElements ? Array.from(cellElements) : [];
  }

  /**
   * Check if there is support at the level below for all cells of a pontoon
   * Used for vertical dependency validation
   */
  hasVerticalSupport(
    position: GridPosition,
    size: GridPosition = { x: 1, y: 1, z: 1 }
  ): { hasSupport: boolean; missingSupportCells: GridPosition[] } {
    const missingSupportCells: GridPosition[] = [];

    // Check each cell that the pontoon would occupy
    for (let x = position.x; x < position.x + size.x; x++) {
      for (let z = position.z; z < position.z + size.z; z++) {
        const supportPosition = { x, y: position.y - 1, z };
        const supportElements = this.getElementsAtPosition(supportPosition);
        
        if (supportElements.length === 0) {
          missingSupportCells.push(supportPosition);
        }
      }
    }

    return {
      hasSupport: missingSupportCells.length === 0,
      missingSupportCells
    };
  }

  /**
   * Get element data by ID
   */
  getElement(elementId: string): SpatialElement | undefined {
    return this.elements.get(elementId);
  }

  /**
   * Get all element IDs
   */
  getAllElementIds(): string[] {
    return Array.from(this.elements.keys());
  }

  /**
   * Get occupied cell count (for debugging/stats)
   */
  getOccupiedCellCount(): number {
    return this.grid.size;
  }

  /**
   * Get total element count
   */
  getElementCount(): number {
    return this.elements.size;
  }

  /**
   * Clear all elements
   */
  clear(): void {
    this.grid.clear();
    this.elements.clear();
  }

  /**
   * Get all occupied cells (for debugging)
   */
  getOccupiedCells(): Map<string, string[]> {
    const occupiedCells = new Map<string, string[]>();
    
    for (const [key, elementSet] of this.grid.entries()) {
      occupiedCells.set(key, Array.from(elementSet));
    }
    
    return occupiedCells;
  }

  /**
   * Validate spatial consistency (for debugging)
   * Returns true if all elements are correctly indexed
   */
  validateConsistency(): boolean {
    // Check that all elements are properly indexed
    for (const [elementId, element] of this.elements.entries()) {
      const { position, bounds } = element;
      
      for (let x = position.x; x < bounds.x; x++) {
        for (let y = position.y; y < bounds.y; y++) {
          for (let z = position.z; z < bounds.z; z++) {
            const key = this.gridMath.getGridKey({ x, y, z });
            const cellElements = this.grid.get(key);
            
            if (!cellElements || !cellElements.has(elementId)) {
              console.error(`Element ${elementId} not found in cell ${key}`);
              return false;
            }
          }
        }
      }
    }

    // Check that all grid references point to valid elements
    for (const [key, elementSet] of this.grid.entries()) {
      for (const elementId of elementSet) {
        if (!this.elements.has(elementId)) {
          console.error(`Invalid element reference ${elementId} in cell ${key}`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Move element to new position
   * Efficiently updates spatial index
   */
  moveElement(
    elementId: string,
    newPosition: GridPosition,
    newSize?: GridPosition
  ): void {
    const element = this.elements.get(elementId);
    if (!element) return;

    // Use existing size if not provided
    const size = newSize || {
      x: element.bounds.x - element.position.x,
      y: element.bounds.y - element.position.y,
      z: element.bounds.z - element.position.z,
    };

    // Remove and re-insert with new position
    this.remove(elementId);
    this.insert(elementId, newPosition, size);
  }

  /**
   * Get memory usage statistics
   */
  getStats(): {
    cellCount: number;
    elementCount: number;
    avgElementsPerCell: number;
    memoryUsage: number;
  } {
    const cellCount = this.grid.size;
    const elementCount = this.elements.size;
    const totalCellReferences = Array.from(this.grid.values())
      .reduce((sum, set) => sum + set.size, 0);
    
    return {
      cellCount,
      elementCount,
      avgElementsPerCell: cellCount > 0 ? totalCellReferences / cellCount : 0,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Estimate memory usage in bytes
   */
  private estimateMemoryUsage(): number {
    // Rough estimation
    const gridMapSize = this.grid.size * 64; // Map overhead + key string
    const elementMapSize = this.elements.size * 128; // Map overhead + element object
    const setOverhead = Array.from(this.grid.values())
      .reduce((sum, set) => sum + set.size * 8, 0); // Set overhead
    
    return gridMapSize + elementMapSize + setOverhead;
  }
}