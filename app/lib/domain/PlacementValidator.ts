/**
 * PlacementValidator - Single Validation Authority
 * 
 * Stateless service providing unified validation logic
 * Eliminates multiple validation paths identified in the analysis
 */

import { GridPosition } from './GridPosition';
import { Pontoon } from './Pontoon';
import { 
  PontoonType, 
  ValidationResult, 
  ValidationError, 
  ValidationErrorType,
  GridDimensions,
  getPontoonTypeConfig
} from './PontoonTypes';

export interface GridState {
  pontoons: Map<string, Pontoon>;
  gridDimensions: GridDimensions;
}

export class PlacementValidator {
  /**
   * SINGLE validation method - eliminates validation inconsistencies
   */
  canPlace(
    gridState: GridState,
    position: GridPosition,
    type: PontoonType,
    excludeId?: string
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // 1. Bounds checking
    const boundsResult = this.validateBounds(position, type, gridState.gridDimensions);
    if (!boundsResult.valid) {
      errors.push(...boundsResult.errors);
    }

    // 2. Occupancy checking
    const occupancyResult = this.validateOccupancy(
      gridState,
      position,
      type,
      excludeId
    );
    if (!occupancyResult.valid) {
      errors.push(...occupancyResult.errors);
    }

    // 3. Support checking (Minecraft-style rules)
    const supportResult = this.validateSupport(gridState, position, type);
    if (!supportResult.valid) {
      errors.push(...supportResult.errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if position has support (for elevated pontoons)
   */
  hasSupport(gridState: GridState, position: GridPosition): boolean {
    // Level 0 always has support (water)
    if (position.isAtWaterLevel()) {
      return true;
    }

    // Higher levels need pontoon directly below
    const supportPosition = position.getBelow();
    return this.isPontoonAtPosition(gridState, supportPosition);
  }

  /**
   * Check if position is occupied by any pontoon
   */
  isOccupied(
    gridState: GridState,
    position: GridPosition,
    excludeId?: string
  ): boolean {
    for (const pontoon of gridState.pontoons.values()) {
      if (excludeId && pontoon.id === excludeId) {
        continue;
      }
      
      if (pontoon.occupiesPosition(position)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if specific pontoon is at position
   */
  isPontoonAtPosition(gridState: GridState, position: GridPosition): boolean {
    return this.isOccupied(gridState, position);
  }

  /**
   * Validate pontoon movement
   */
  canMove(
    gridState: GridState,
    pontoonId: string,
    newPosition: GridPosition
  ): ValidationResult {
    const pontoon = gridState.pontoons.get(pontoonId);
    
    if (!pontoon) {
      return {
        valid: false,
        errors: [{
          type: ValidationErrorType.INVALID_POSITION,
          message: 'Pontoon not found',
          position: newPosition
        }]
      };
    }

    // Validate new position (excluding current pontoon)
    return this.canPlace(gridState, newPosition, pontoon.type, pontoonId);
  }

  /**
   * Find optimal placement positions near target
   */
  findNearbyValidPositions(
    gridState: GridState,
    targetPosition: GridPosition,
    type: PontoonType,
    maxDistance: number = 5
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

          const candidatePosition = new GridPosition(x, targetPosition.y, z);
          const validation = this.canPlace(gridState, candidatePosition, type);
          
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
   * Validate platform connectivity
   */
  validateConnectivity(gridState: GridState): ValidationResult {
    const pontoonIds = Array.from(gridState.pontoons.keys());
    
    if (pontoonIds.length <= 1) {
      return { valid: true, errors: [] };
    }

    // Perform flood fill to check connectivity
    const visited = new Set<string>();
    const queue = [pontoonIds[0]];
    visited.add(pontoonIds[0]);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const pontoon = gridState.pontoons.get(currentId);
      
      if (!pontoon) continue;

      // Check all positions occupied by this pontoon
      for (const position of pontoon.getOccupiedPositions()) {
        // Check each horizontal neighbor for connected pontoons
        for (const neighbor of position.getHorizontalNeighbors()) {
          const neighborPontoon = this.getPontoonAtPosition(gridState, neighbor);
          
          if (neighborPontoon && !visited.has(neighborPontoon.id)) {
            visited.add(neighborPontoon.id);
            queue.push(neighborPontoon.id);
          }
        }
      }
    }

    const isConnected = visited.size === pontoonIds.length;
    
    return {
      valid: isConnected,
      errors: isConnected ? [] : [{
        type: ValidationErrorType.INVALID_POSITION,
        message: 'Platform is not fully connected'
      }]
    };
  }

  /**
   * Get pontoon at specific position
   */
  getPontoonAtPosition(gridState: GridState, position: GridPosition): Pontoon | null {
    for (const pontoon of gridState.pontoons.values()) {
      if (pontoon.occupiesPosition(position)) {
        return pontoon;
      }
    }
    return null;
  }

  /**
   * Validate bounds checking
   */
  private validateBounds(
    position: GridPosition,
    type: PontoonType,
    gridDimensions: GridDimensions
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const config = getPontoonTypeConfig(type);

    // Check if position is within grid bounds
    if (position.x < 0 || position.y < 0 || position.z < 0) {
      errors.push({
        type: ValidationErrorType.OUT_OF_BOUNDS,
        message: 'Position cannot be negative',
        position
      });
    }

    // Check if pontoon extends beyond grid bounds
    if (position.x + config.gridSize.x > gridDimensions.width ||
        position.y + config.gridSize.y > gridDimensions.levels ||
        position.z + config.gridSize.z > gridDimensions.height) {
      errors.push({
        type: ValidationErrorType.OUT_OF_BOUNDS,
        message: 'Pontoon extends beyond grid boundaries',
        position
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate occupancy checking
   */
  private validateOccupancy(
    gridState: GridState,
    position: GridPosition,
    type: PontoonType,
    excludeId?: string
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const config = getPontoonTypeConfig(type);

    // Check all cells that the pontoon would occupy
    for (let x = 0; x < config.gridSize.x; x++) {
      for (let y = 0; y < config.gridSize.y; y++) {
        for (let z = 0; z < config.gridSize.z; z++) {
          const checkPosition = position.moveBy(x, y, z);
          
          if (this.isOccupied(gridState, checkPosition, excludeId)) {
            errors.push({
              type: ValidationErrorType.CELL_OCCUPIED,
              message: `Position ${checkPosition.toString()} is already occupied`,
              position: checkPosition
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate support checking (Minecraft-style rules)
   */
  private validateSupport(
    gridState: GridState,
    position: GridPosition,
    type: PontoonType
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Level 0 (water surface) always has support
    if (position.isAtWaterLevel()) {
      return { valid: true, errors: [] };
    }

    const config = getPontoonTypeConfig(type);

    // Check support for all cells that the pontoon would occupy
    for (let x = 0; x < config.gridSize.x; x++) {
      for (let z = 0; z < config.gridSize.z; z++) {
        const checkPosition = position.moveBy(x, 0, z);
        
        if (!this.hasSupport(gridState, checkPosition)) {
          errors.push({
            type: ValidationErrorType.NO_SUPPORT,
            message: `No support at position ${checkPosition.toString()}`,
            position: checkPosition
          });
        }
      }
    }

    // For Level 2: Additionally check that Level 1 has complete support
    if (position.y === 2) {
      const level1ValidationResult = this.validateCompleteVerticalStack(
        gridState,
        position,
        type
      );
      if (!level1ValidationResult.valid) {
        errors.push(...level1ValidationResult.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate complete vertical stack for Level 2 placement
   */
  private validateCompleteVerticalStack(
    gridState: GridState,
    position: GridPosition,
    type: PontoonType
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const config = getPontoonTypeConfig(type);

    // Check each cell for complete vertical stack (Level 0 + Level 1)
    for (let x = 0; x < config.gridSize.x; x++) {
      for (let z = 0; z < config.gridSize.z; z++) {
        const level0Position = new GridPosition(position.x + x, 0, position.z + z);
        const level1Position = new GridPosition(position.x + x, 1, position.z + z);
        
        if (!this.isPontoonAtPosition(gridState, level0Position)) {
          errors.push({
            type: ValidationErrorType.NO_SUPPORT,
            message: `Level 2 requires pontoon on Level 0 at position ${level0Position.toString()}`,
            position: level0Position
          });
        }
        
        if (!this.isPontoonAtPosition(gridState, level1Position)) {
          errors.push({
            type: ValidationErrorType.NO_SUPPORT,
            message: `Level 2 requires pontoon on Level 1 at position ${level1Position.toString()}`,
            position: level1Position
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}