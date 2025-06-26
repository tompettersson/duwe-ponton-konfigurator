/**
 * GridPosition - Unit Tests
 * 
 * Comprehensive test suite for GridPosition value object
 * Tests immutability, coordinate transformations, and edge cases
 */

import { GridPosition } from '../../domain/GridPosition';

describe('GridPosition', () => {
  describe('Constructor', () => {
    test('should create valid GridPosition with positive coordinates', () => {
      const position = new GridPosition(5, 2, 8);
      
      expect(position.x).toBe(5);
      expect(position.y).toBe(2);
      expect(position.z).toBe(8);
    });

    test('should accept zero coordinates', () => {
      const position = new GridPosition(0, 0, 0);
      
      expect(position.x).toBe(0);
      expect(position.y).toBe(0);
      expect(position.z).toBe(0);
    });

    test('should throw error for negative coordinates', () => {
      expect(() => new GridPosition(-1, 0, 0)).toThrow('Grid coordinates must be non-negative');
      expect(() => new GridPosition(0, -1, 0)).toThrow('Grid coordinates must be non-negative');
      expect(() => new GridPosition(0, 0, -1)).toThrow('Grid coordinates must be non-negative');
    });

    test('should throw error for non-integer coordinates', () => {
      expect(() => new GridPosition(1.5, 0, 0)).toThrow('Grid coordinates must be integers');
      expect(() => new GridPosition(0, 2.7, 0)).toThrow('Grid coordinates must be integers');
      expect(() => new GridPosition(0, 0, 3.14)).toThrow('Grid coordinates must be integers');
    });
  });

  describe('Movement Operations', () => {
    test('moveBy should create new GridPosition with offset', () => {
      const original = new GridPosition(5, 2, 8);
      const moved = original.moveBy(2, 1, -3);
      
      expect(moved.x).toBe(7);
      expect(moved.y).toBe(3);
      expect(moved.z).toBe(5);
      
      // Original should be unchanged (immutability)
      expect(original.x).toBe(5);
      expect(original.y).toBe(2);
      expect(original.z).toBe(8);
    });

    test('moveToDirection should move correctly in all directions', () => {
      const center = new GridPosition(5, 5, 5);
      
      expect(center.moveToDirection('north')).toEqual(new GridPosition(5, 5, 4));
      expect(center.moveToDirection('south')).toEqual(new GridPosition(5, 5, 6));
      expect(center.moveToDirection('east')).toEqual(new GridPosition(6, 5, 5));
      expect(center.moveToDirection('west')).toEqual(new GridPosition(4, 5, 5));
      expect(center.moveToDirection('up')).toEqual(new GridPosition(5, 6, 5));
      expect(center.moveToDirection('down')).toEqual(new GridPosition(5, 4, 5));
    });

    test('getBelow and getAbove should move vertically', () => {
      const position = new GridPosition(3, 1, 7);
      
      expect(position.getBelow()).toEqual(new GridPosition(3, 0, 7));
      expect(position.getAbove()).toEqual(new GridPosition(3, 2, 7));
    });
  });

  describe('Equality and Comparison', () => {
    test('equals should return true for identical positions', () => {
      const pos1 = new GridPosition(3, 1, 4);
      const pos2 = new GridPosition(3, 1, 4);
      
      expect(pos1.equals(pos2)).toBe(true);
      expect(pos2.equals(pos1)).toBe(true);
    });

    test('equals should return false for different positions', () => {
      const pos1 = new GridPosition(3, 1, 4);
      const pos2 = new GridPosition(3, 1, 5);
      const pos3 = new GridPosition(3, 2, 4);
      const pos4 = new GridPosition(4, 1, 4);
      
      expect(pos1.equals(pos2)).toBe(false);
      expect(pos1.equals(pos3)).toBe(false);
      expect(pos1.equals(pos4)).toBe(false);
    });

    test('distanceTo should calculate Manhattan distance', () => {
      const pos1 = new GridPosition(0, 0, 0);
      const pos2 = new GridPosition(3, 4, 5);
      
      expect(pos1.distanceTo(pos2)).toBe(12); // |3-0| + |4-0| + |5-0| = 12
      expect(pos2.distanceTo(pos1)).toBe(12); // Distance is symmetric
    });
  });

  describe('Neighbor Operations', () => {
    test('getNeighbors should return all 6 adjacent positions', () => {
      const center = new GridPosition(5, 5, 5);
      const neighbors = center.getNeighbors();
      
      expect(neighbors).toHaveLength(6);
      expect(neighbors).toContainEqual(new GridPosition(5, 5, 4)); // north
      expect(neighbors).toContainEqual(new GridPosition(5, 5, 6)); // south
      expect(neighbors).toContainEqual(new GridPosition(6, 5, 5)); // east
      expect(neighbors).toContainEqual(new GridPosition(4, 5, 5)); // west
      expect(neighbors).toContainEqual(new GridPosition(5, 6, 5)); // up
      expect(neighbors).toContainEqual(new GridPosition(5, 4, 5)); // down
    });

    test('getHorizontalNeighbors should return only 4 same-level positions', () => {
      const center = new GridPosition(5, 5, 5);
      const neighbors = center.getHorizontalNeighbors();
      
      expect(neighbors).toHaveLength(4);
      expect(neighbors).toContainEqual(new GridPosition(5, 5, 4)); // north
      expect(neighbors).toContainEqual(new GridPosition(5, 5, 6)); // south
      expect(neighbors).toContainEqual(new GridPosition(6, 5, 5)); // east
      expect(neighbors).toContainEqual(new GridPosition(4, 5, 5)); // west
      
      // Should not contain vertical neighbors
      expect(neighbors).not.toContainEqual(new GridPosition(5, 6, 5));
      expect(neighbors).not.toContainEqual(new GridPosition(5, 4, 5));
    });
  });

  describe('Level Queries', () => {
    test('isAtWaterLevel should return true only for y=0', () => {
      expect(new GridPosition(5, 0, 5).isAtWaterLevel()).toBe(true);
      expect(new GridPosition(5, 1, 5).isAtWaterLevel()).toBe(false);
      expect(new GridPosition(5, 2, 5).isAtWaterLevel()).toBe(false);
    });

    test('isElevated should return true for y>0', () => {
      expect(new GridPosition(5, 0, 5).isElevated()).toBe(false);
      expect(new GridPosition(5, 1, 5).isElevated()).toBe(true);
      expect(new GridPosition(5, 2, 5).isElevated()).toBe(true);
    });
  });

  describe('String Operations', () => {
    test('toString should return formatted coordinate string', () => {
      const position = new GridPosition(12, 3, 45);
      expect(position.toString()).toBe('12,3,45');
    });

    test('fromString should parse coordinate string correctly', () => {
      const position = GridPosition.fromString('12,3,45');
      
      expect(position.x).toBe(12);
      expect(position.y).toBe(3);
      expect(position.z).toBe(45);
    });

    test('fromString should throw error for invalid strings', () => {
      expect(() => GridPosition.fromString('1,2')).toThrow('Invalid GridPosition string');
      expect(() => GridPosition.fromString('1,2,3,4')).toThrow('Invalid GridPosition string');
      expect(() => GridPosition.fromString('a,b,c')).toThrow('Invalid GridPosition string');
      expect(() => GridPosition.fromString('1.5,2,3')).toThrow('Grid coordinates must be integers');
    });

    test('toString and fromString should be reversible', () => {
      const original = new GridPosition(7, 2, 15);
      const roundTrip = GridPosition.fromString(original.toString());
      
      expect(roundTrip.equals(original)).toBe(true);
    });
  });

  describe('Area Operations', () => {
    test('getRectangularArea should generate correct position array', () => {
      const topLeft = new GridPosition(1, 0, 1);
      const bottomRight = new GridPosition(3, 2, 3);
      
      const area = GridPosition.getRectangularArea(topLeft, bottomRight);
      
      // Should have 3x3x3 = 27 positions
      expect(area).toHaveLength(27);
      
      // Check corners are included
      expect(area).toContainEqual(new GridPosition(1, 0, 1));
      expect(area).toContainEqual(new GridPosition(3, 2, 3));
      expect(area).toContainEqual(new GridPosition(1, 0, 3));
      expect(area).toContainEqual(new GridPosition(3, 2, 1));
    });

    test('getRectangularArea should work with reversed corners', () => {
      const bottomRight = new GridPosition(1, 0, 1);
      const topLeft = new GridPosition(3, 2, 3);
      
      const area = GridPosition.getRectangularArea(bottomRight, topLeft);
      
      // Should generate same area regardless of corner order
      expect(area).toHaveLength(27);
      expect(area).toContainEqual(new GridPosition(1, 0, 1));
      expect(area).toContainEqual(new GridPosition(3, 2, 3));
    });

    test('getRectangularArea should handle single cell area', () => {
      const single = new GridPosition(5, 1, 7);
      const area = GridPosition.getRectangularArea(single, single);
      
      expect(area).toHaveLength(1);
      expect(area[0].equals(single)).toBe(true);
    });
  });

  describe('JSON Serialization', () => {
    test('toJSON should create correct JSON representation', () => {
      const position = new GridPosition(8, 2, 15);
      const json = position.toJSON();
      
      expect(json).toEqual({ x: 8, y: 2, z: 15 });
    });

    test('fromJSON should create GridPosition from JSON', () => {
      const json = { x: 8, y: 2, z: 15 };
      const position = GridPosition.fromJSON(json);
      
      expect(position.x).toBe(8);
      expect(position.y).toBe(2);
      expect(position.z).toBe(15);
    });

    test('toJSON and fromJSON should be reversible', () => {
      const original = new GridPosition(42, 7, 123);
      const roundTrip = GridPosition.fromJSON(original.toJSON());
      
      expect(roundTrip.equals(original)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle large coordinate values', () => {
      const large = new GridPosition(999999, 999999, 999999);
      
      expect(large.x).toBe(999999);
      expect(large.moveBy(1, 0, 0).x).toBe(1000000);
    });

    test('movement that would create negative coordinates should still work', () => {
      const position = new GridPosition(5, 5, 5);
      
      // moveBy can create negative coordinates (for intermediate calculations)
      const moved = position.moveBy(-10, -10, -10);
      expect(moved.x).toBe(-5);
      expect(moved.y).toBe(-5);
      expect(moved.z).toBe(-5);
    });

    test('getBelow should handle y=0 correctly', () => {
      const waterLevel = new GridPosition(5, 0, 5);
      const below = waterLevel.getBelow();
      
      // Should create position with y=-1 (for calculation purposes)
      expect(below.y).toBe(-1);
    });
  });
});