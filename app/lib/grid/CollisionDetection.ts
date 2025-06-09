/**
 * CollisionDetection - Advanced Collision and Validation Logic
 * 
 * Provides comprehensive validation for pontoon placement
 * Includes structural integrity and rule-based validation
 */

import { SpatialHashGrid } from './SpatialHashGrid';
import { GridMathematics } from './GridMathematics';
import type { GridPosition, PontoonElement, ValidationResult } from '../../types';

export class CollisionDetection {
  private spatialGrid: SpatialHashGrid;
  private gridMath: GridMathematics;

  constructor(spatialGrid: SpatialHashGrid, gridMath: GridMathematics) {
    this.spatialGrid = spatialGrid;
    this.gridMath = gridMath;
  }

  /**
   * Validate pontoon placement at position
   * Returns detailed validation result with error messages
   */
  validatePlacement(
    position: GridPosition,
    pontoonType: PontoonElement['type'],
    gridBounds: { width: number; height: number },
    excludeId?: string
  ): ValidationResult {
    const errors: string[] = [];

    // Check bounds
    if (!this.gridMath.isInBounds(position, gridBounds)) {
      errors.push('Position außerhalb der Rastergrenzen');
    }

    // Get pontoon size based on type
    const size = this.getPontoonSize(pontoonType);

    // Check if placement extends beyond grid bounds
    if (position.x + size.x > gridBounds.width ||
        position.z + size.z > gridBounds.height) {
      errors.push('Ponton erstreckt sich über Rastergrenzen hinaus');
    }

    // Check collision with existing pontoons
    if (this.spatialGrid.checkCollision(position, size, excludeId)) {
      errors.push('Position bereits belegt');
    }

    // Validate structural support (for elevated pontoons)
    if (position.y > 0) {
      const supportValidation = this.validateStructuralSupport(position, size);
      if (!supportValidation.valid) {
        errors.push(...supportValidation.errors);
      }
    }

    // Validate pontoon type specific rules
    const typeValidation = this.validatePontoonTypeRules(position, pontoonType, size);
    if (!typeValidation.valid) {
      errors.push(...typeValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if pontoon can be moved to new position
   */
  validateMove(
    elementId: string,
    newPosition: GridPosition,
    gridBounds: { width: number; height: number }
  ): ValidationResult {
    const element = this.spatialGrid.getElement(elementId);
    if (!element) {
      return {
        valid: false,
        errors: ['Element not found'],
      };
    }

    // Calculate size from current element
    const size = {
      x: element.bounds.x - element.position.x,
      y: element.bounds.y - element.position.y,
      z: element.bounds.z - element.position.z,
    };

    // Validate new position (excluding current element)
    return this.validatePlacement(newPosition, 'single', gridBounds, elementId);
  }

  /**
   * Validate structural support for elevated pontoons
   */
  private validateStructuralSupport(
    position: GridPosition,
    size: GridPosition
  ): ValidationResult {
    const errors: string[] = [];

    // Check each cell below the pontoon for support
    for (let x = position.x; x < position.x + size.x; x++) {
      for (let z = position.z; z < position.z + size.z; z++) {
        const supportPosition = { x, y: position.y - 1, z };
        const supportElements = this.spatialGrid.getElementsAtPosition(supportPosition);
        
        if (supportElements.length === 0) {
          errors.push(`Keine strukturelle Unterstützung an Position (${x}, ${position.y - 1}, ${z})`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate pontoon type specific rules
   */
  private validatePontoonTypeRules(
    position: GridPosition,
    type: PontoonElement['type'],
    size: GridPosition
  ): ValidationResult {
    const errors: string[] = [];

    switch (type) {
      case 'double':
        // Double pontoons need extra space validation
        // No special placement rules currently
        break;

      case 'single':
      default:
        // Single pontoons have no special rules
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if position is at the edge of the platform
   */
  private isAtEdge(position: GridPosition, size: GridPosition): boolean {
    // Get neighbors for all cells occupied by the pontoon
    for (let x = position.x; x < position.x + size.x; x++) {
      for (let z = position.z; z < position.z + size.z; z++) {
        const neighbors = this.gridMath.getNeighbors({ x, y: position.y, z });
        
        // Check if any neighbor is empty (indicating edge)
        for (const neighbor of neighbors) {
          if (neighbor.y === position.y) { // Same level
            const elements = this.spatialGrid.getElementsAtPosition(neighbor);
            if (elements.length === 0) {
              return true; // Found empty neighbor, this is an edge
            }
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Get pontoon size based on type
   */
  private getPontoonSize(type: PontoonElement['type']): GridPosition {
    switch (type) {
      case 'single':
        return { x: 1, y: 1, z: 1 };
      case 'double':
        return { x: 2, y: 1, z: 1 }; // Double pontoon spans 2 grid cells horizontally
      default:
        return { x: 1, y: 1, z: 1 };
    }
  }

  /**
   * Find optimal placement positions near a target position
   */
  findNearbyValidPositions(
    targetPosition: GridPosition,
    pontoonType: PontoonElement['type'],
    gridBounds: { width: number; height: number },
    maxDistance = 5
  ): GridPosition[] {
    const validPositions: GridPosition[] = [];
    
    // Search in expanding radius around target
    for (let distance = 0; distance <= maxDistance; distance++) {
      for (let x = targetPosition.x - distance; x <= targetPosition.x + distance; x++) {
        for (let z = targetPosition.z - distance; z <= targetPosition.z + distance; z++) {
          // Only check positions at the current distance ring
          if (Math.abs(x - targetPosition.x) !== distance && 
              Math.abs(z - targetPosition.z) !== distance) {
            continue;
          }

          const candidatePosition = { x, y: targetPosition.y, z };
          const validation = this.validatePlacement(candidatePosition, pontoonType, gridBounds);
          
          if (validation.valid) {
            validPositions.push(candidatePosition);
          }
        }
      }
      
      // Return early if we found valid positions at this distance
      if (validPositions.length > 0) {
        break;
      }
    }

    return validPositions;
  }

  /**
   * Check connectivity of the platform
   * Returns true if all pontoons are connected
   */
  validatePlatformConnectivity(): ValidationResult {
    const elementIds = this.spatialGrid.getAllElementIds();
    
    if (elementIds.length === 0) {
      return { valid: true, errors: [] };
    }

    if (elementIds.length === 1) {
      return { valid: true, errors: [] };
    }

    // Perform flood fill to check connectivity
    const visited = new Set<string>();
    const queue = [elementIds[0]];
    visited.add(elementIds[0]);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const element = this.spatialGrid.getElement(currentId);
      
      if (!element) continue;

      // Check all positions occupied by this element
      for (let x = element.position.x; x < element.bounds.x; x++) {
        for (let y = element.position.y; y < element.bounds.y; y++) {
          for (let z = element.position.z; z < element.bounds.z; z++) {
            const neighbors = this.gridMath.getNeighbors({ x, y, z });
            
            // Check each neighbor for connected pontoons
            for (const neighbor of neighbors) {
              const neighborElements = this.spatialGrid.getElementsAtPosition(neighbor);
              
              for (const neighborId of neighborElements) {
                if (!visited.has(neighborId)) {
                  visited.add(neighborId);
                  queue.push(neighborId);
                }
              }
            }
          }
        }
      }
    }

    const isConnected = visited.size === elementIds.length;
    
    return {
      valid: isConnected,
      errors: isConnected ? [] : ['Plattform ist nicht vollständig verbunden'],
    };
  }

  /**
   * Get collision information for debugging
   */
  getCollisionInfo(position: GridPosition, size: GridPosition = { x: 1, y: 1, z: 1 }): {
    hasCollision: boolean;
    collidingElements: string[];
    affectedCells: string[];
  } {
    const collidingElements = this.spatialGrid.query(position, size);
    const affectedCells: string[] = [];

    for (let x = position.x; x < position.x + size.x; x++) {
      for (let y = position.y; y < position.y + size.y; y++) {
        for (let z = position.z; z < position.z + size.z; z++) {
          affectedCells.push(this.gridMath.getGridKey({ x, y, z }));
        }
      }
    }

    return {
      hasCollision: collidingElements.length > 0,
      collidingElements,
      affectedCells,
    };
  }
}