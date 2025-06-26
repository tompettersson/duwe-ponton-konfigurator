/**
 * PlacementValidator - Unit Tests
 * 
 * Critical tests for placement validation logic
 * Ensures Minecraft-style support rules work correctly
 */

import { PlacementValidator, GridState } from '../../domain/PlacementValidator';
import { Grid } from '../../domain/Grid';
import { GridPosition } from '../../domain/GridPosition';
import { Pontoon } from '../../domain/Pontoon';
import { PontoonType, PontoonColor, Rotation, ValidationErrorType } from '../../domain/PontoonTypes';

describe('PlacementValidator', () => {
  let validator: PlacementValidator;
  let grid: Grid;
  let gridState: GridState;

  beforeEach(() => {
    validator = new PlacementValidator();
    grid = Grid.createEmpty(10, 10, 3);
    gridState = {
      pontoons: grid.pontoons,
      gridDimensions: grid.dimensions
    };
  });

  describe('Basic Validation', () => {
    test('should allow placement on water level (y=0)', () => {
      const position = new GridPosition(5, 0, 5);
      const result = validator.canPlace(gridState, position, PontoonType.SINGLE);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject placement outside grid bounds', () => {
      const position = new GridPosition(15, 0, 5); // x=15 outside 10x10 grid
      const result = validator.canPlace(gridState, position, PontoonType.SINGLE);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe(ValidationErrorType.OUT_OF_BOUNDS);
    });

    test('should reject placement on occupied cell', () => {
      // Place a pontoon first
      const position = new GridPosition(5, 0, 5);
      grid = grid.placePontoon(position, PontoonType.SINGLE, PontoonColor.BLUE);
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      // Try to place another pontoon at same position
      const result = validator.canPlace(gridState, position, PontoonType.SINGLE);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe(ValidationErrorType.CELL_OCCUPIED);
    });
  });

  describe('Support Validation (Minecraft Rules)', () => {
    test('should allow Level 0 placement without support', () => {
      const position = new GridPosition(5, 0, 5);
      const result = validator.canPlace(gridState, position, PontoonType.SINGLE);
      
      expect(result.valid).toBe(true);
    });

    test('should reject Level 1 placement without Level 0 support', () => {
      const position = new GridPosition(5, 1, 5); // Level 1 without support
      const result = validator.canPlace(gridState, position, PontoonType.SINGLE);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe(ValidationErrorType.NO_SUPPORT);
    });

    test('should allow Level 1 placement with Level 0 support', () => {
      // Place support pontoon on Level 0
      const supportPos = new GridPosition(5, 0, 5);
      grid = grid.placePontoon(supportPos, PontoonType.SINGLE, PontoonColor.BLUE);
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      // Place pontoon on Level 1
      const position = new GridPosition(5, 1, 5);
      const result = validator.canPlace(gridState, position, PontoonType.SINGLE);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject Level 2 placement without complete stack', () => {
      // Place only Level 0 support
      const supportPos = new GridPosition(5, 0, 5);
      grid = grid.placePontoon(supportPos, PontoonType.SINGLE, PontoonColor.BLUE);
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      // Try Level 2 without Level 1
      const position = new GridPosition(5, 2, 5);
      const result = validator.canPlace(gridState, position, PontoonType.SINGLE);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe(ValidationErrorType.NO_SUPPORT);
    });

    test('should allow Level 2 placement with complete support stack', () => {
      // Build complete support stack
      const basePos = new GridPosition(5, 0, 5);
      const level1Pos = new GridPosition(5, 1, 5);
      
      grid = grid.placePontoon(basePos, PontoonType.SINGLE, PontoonColor.BLUE);
      grid = grid.placePontoon(level1Pos, PontoonType.SINGLE, PontoonColor.BLUE);
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      // Place Level 2
      const level2Pos = new GridPosition(5, 2, 5);
      const result = validator.canPlace(gridState, position, PontoonType.SINGLE);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Double Pontoon Validation', () => {
    test('should validate bounds for double pontoon', () => {
      const position = new GridPosition(9, 0, 5); // x=9, double pontoon extends to x=10 (out of bounds)
      const result = validator.canPlace(gridState, position, PontoonType.DOUBLE);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe(ValidationErrorType.OUT_OF_BOUNDS);
    });

    test('should validate occupancy for both cells of double pontoon', () => {
      // Place single pontoon that would conflict with double pontoon
      const conflictPos = new GridPosition(6, 0, 5);
      grid = grid.placePontoon(conflictPos, PontoonType.SINGLE, PontoonColor.BLUE);
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      // Try to place double pontoon that would overlap
      const doublePos = new GridPosition(5, 0, 5); // Double extends to (6,0,5)
      const result = validator.canPlace(gridState, doublePos, PontoonType.DOUBLE);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe(ValidationErrorType.CELL_OCCUPIED);
    });

    test('should require support for both cells of elevated double pontoon', () => {
      // Place only one support pontoon
      const supportPos = new GridPosition(5, 0, 5);
      grid = grid.placePontoon(supportPos, PontoonType.SINGLE, PontoonColor.BLUE);
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      // Try to place double pontoon on Level 1 (needs support at both 5,0,5 and 6,0,5)
      const doublePos = new GridPosition(5, 1, 5);
      const result = validator.canPlace(gridState, doublePos, PontoonType.DOUBLE);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe(ValidationErrorType.NO_SUPPORT);
    });

    test('should allow double pontoon with complete support', () => {
      // Place both support pontoons
      const support1 = new GridPosition(5, 0, 5);
      const support2 = new GridPosition(6, 0, 5);
      
      grid = grid.placePontoon(support1, PontoonType.SINGLE, PontoonColor.BLUE);
      grid = grid.placePontoon(support2, PontoonType.SINGLE, PontoonColor.BLUE);
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      // Place double pontoon on Level 1
      const doublePos = new GridPosition(5, 1, 5);
      const result = validator.canPlace(gridState, doublePos, PontoonType.DOUBLE);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Exclude ID Functionality', () => {
    test('should ignore specified pontoon ID when checking occupancy', () => {
      // Place a pontoon
      const position = new GridPosition(5, 0, 5);
      grid = grid.placePontoon(position, PontoonType.SINGLE, PontoonColor.BLUE);
      const pontoonId = Array.from(grid.pontoons.keys())[0];
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      // Should allow "placement" at same position when excluding the existing pontoon
      const result = validator.canPlace(gridState, position, PontoonType.SINGLE, pontoonId);
      
      expect(result.valid).toBe(true);
    });

    test('should still check other validation rules when excluding ID', () => {
      // Place a pontoon
      const position = new GridPosition(5, 0, 5);
      grid = grid.placePontoon(position, PontoonType.SINGLE, PontoonColor.BLUE);
      const pontoonId = Array.from(grid.pontoons.keys())[0];
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      // Try to place at invalid position (out of bounds) while excluding existing pontoon
      const invalidPos = new GridPosition(15, 0, 5);
      const result = validator.canPlace(gridState, invalidPos, PontoonType.SINGLE, pontoonId);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe(ValidationErrorType.OUT_OF_BOUNDS);
    });
  });

  describe('Movement Validation', () => {
    test('should validate pontoon movement', () => {
      // Place a pontoon
      const originalPos = new GridPosition(5, 0, 5);
      grid = grid.placePontoon(originalPos, PontoonType.SINGLE, PontoonColor.BLUE);
      const pontoonId = Array.from(grid.pontoons.keys())[0];
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      // Try to move to valid position
      const newPos = new GridPosition(6, 0, 5);
      const result = validator.canMove(gridState, pontoonId, newPos);
      
      expect(result.valid).toBe(true);
    });

    test('should reject movement to occupied position', () => {
      // Place two pontoons
      const pos1 = new GridPosition(5, 0, 5);
      const pos2 = new GridPosition(6, 0, 5);
      
      grid = grid.placePontoon(pos1, PontoonType.SINGLE, PontoonColor.BLUE);
      grid = grid.placePontoon(pos2, PontoonType.SINGLE, PontoonColor.BLUE);
      
      const pontoonIds = Array.from(grid.pontoons.keys());
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      // Try to move first pontoon to position of second pontoon
      const result = validator.canMove(gridState, pontoonIds[0], pos2);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe(ValidationErrorType.CELL_OCCUPIED);
    });

    test('should reject movement of non-existent pontoon', () => {
      const result = validator.canMove(gridState, 'non-existent-id', new GridPosition(5, 0, 5));
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe(ValidationErrorType.INVALID_POSITION);
    });
  });

  describe('Support Detection', () => {
    test('hasSupport should return true for water level', () => {
      const position = new GridPosition(5, 0, 5);
      const result = validator.hasSupport(gridState, position);
      
      expect(result).toBe(true);
    });

    test('hasSupport should return false for unsupported elevated position', () => {
      const position = new GridPosition(5, 1, 5);
      const result = validator.hasSupport(gridState, position);
      
      expect(result).toBe(false);
    });

    test('hasSupport should return true for supported elevated position', () => {
      // Place support pontoon
      const supportPos = new GridPosition(5, 0, 5);
      grid = grid.placePontoon(supportPos, PontoonType.SINGLE, PontoonColor.BLUE);
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      const position = new GridPosition(5, 1, 5);
      const result = validator.hasSupport(gridState, position);
      
      expect(result).toBe(true);
    });
  });

  describe('Pontoon Detection', () => {
    test('isPontoonAtPosition should return false for empty position', () => {
      const position = new GridPosition(5, 0, 5);
      const result = validator.isPontoonAtPosition(gridState, position);
      
      expect(result).toBe(false);
    });

    test('isPontoonAtPosition should return true for occupied position', () => {
      const position = new GridPosition(5, 0, 5);
      grid = grid.placePontoon(position, PontoonType.SINGLE, PontoonColor.BLUE);
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      const result = validator.isPontoonAtPosition(gridState, position);
      
      expect(result).toBe(true);
    });

    test('getPontoonAtPosition should return null for empty position', () => {
      const position = new GridPosition(5, 0, 5);
      const result = validator.getPontoonAtPosition(gridState, position);
      
      expect(result).toBeNull();
    });

    test('getPontoonAtPosition should return pontoon for occupied position', () => {
      const position = new GridPosition(5, 0, 5);
      grid = grid.placePontoon(position, PontoonType.SINGLE, PontoonColor.BLUE);
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      const result = validator.getPontoonAtPosition(gridState, position);
      
      expect(result).not.toBeNull();
      expect(result!.position.equals(position)).toBe(true);
      expect(result!.type).toBe(PontoonType.SINGLE);
      expect(result!.color).toBe(PontoonColor.BLUE);
    });
  });

  describe('Nearby Valid Positions', () => {
    test('should find valid positions near target', () => {
      const targetPos = new GridPosition(5, 0, 5);
      const validPositions = validator.findNearbyValidPositions(
        gridState, 
        targetPos, 
        PontoonType.SINGLE, 
        2
      );
      
      // Should find multiple valid positions within distance 2
      expect(validPositions.length).toBeGreaterThan(0);
      
      // All positions should be valid for placement
      for (const pos of validPositions) {
        const result = validator.canPlace(gridState, pos, PontoonType.SINGLE);
        expect(result.valid).toBe(true);
      }
    });

    test('should return empty array when no valid positions exist', () => {
      // Fill a small area completely
      for (let x = 4; x <= 6; x++) {
        for (let z = 4; z <= 6; z++) {
          const pos = new GridPosition(x, 0, z);
          grid = grid.placePontoon(pos, PontoonType.SINGLE, PontoonColor.BLUE);
        }
      }
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      const targetPos = new GridPosition(5, 0, 5);
      const validPositions = validator.findNearbyValidPositions(
        gridState,
        targetPos,
        PontoonType.SINGLE,
        1 // Small search radius
      );
      
      expect(validPositions).toHaveLength(0);
    });
  });

  describe('Platform Connectivity', () => {
    test('should validate connectivity for single pontoon', () => {
      const position = new GridPosition(5, 0, 5);
      grid = grid.placePontoon(position, PontoonType.SINGLE, PontoonColor.BLUE);
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      const result = validator.validateConnectivity(gridState);
      
      expect(result.valid).toBe(true);
    });

    test('should validate connectivity for connected pontoons', () => {
      // Place connected pontoons
      const pos1 = new GridPosition(5, 0, 5);
      const pos2 = new GridPosition(6, 0, 5); // Adjacent to pos1
      
      grid = grid.placePontoon(pos1, PontoonType.SINGLE, PontoonColor.BLUE);
      grid = grid.placePontoon(pos2, PontoonType.SINGLE, PontoonColor.BLUE);
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      const result = validator.validateConnectivity(gridState);
      
      expect(result.valid).toBe(true);
    });

    test('should detect disconnected pontoons', () => {
      // Place disconnected pontoons
      const pos1 = new GridPosition(2, 0, 2);
      const pos2 = new GridPosition(8, 0, 8); // Far from pos1
      
      grid = grid.placePontoon(pos1, PontoonType.SINGLE, PontoonColor.BLUE);
      grid = grid.placePontoon(pos2, PontoonType.SINGLE, PontoonColor.BLUE);
      gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      
      const result = validator.validateConnectivity(gridState);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe(ValidationErrorType.INVALID_POSITION);
    });

    test('should handle empty grid as valid', () => {
      const result = validator.validateConnectivity(gridState);
      
      expect(result.valid).toBe(true);
    });
  });
});