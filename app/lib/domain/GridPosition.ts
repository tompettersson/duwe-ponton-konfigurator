/**
 * GridPosition - Value Object for Grid Coordinates
 * 
 * Immutable representation of a position in the grid coordinate system
 * Provides coordinate transformations and equality comparisons
 */

export class GridPosition {
  readonly x: number;  // Grid cell X (0-based)
  readonly y: number;  // Level (0=water, 1=first deck, 2=second deck)
  readonly z: number;  // Grid cell Z (0-based)

  constructor(x: number, y: number, z: number) {
    // Validate coordinates
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) {
      throw new Error('Grid coordinates must be integers');
    }
    
    if (x < 0 || y < 0 || z < 0) {
      throw new Error('Grid coordinates must be non-negative');
    }

    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Create new GridPosition moved by offset
   */
  moveBy(offsetX: number, offsetY: number, offsetZ: number): GridPosition {
    return new GridPosition(
      this.x + offsetX,
      this.y + offsetY,
      this.z + offsetZ
    );
  }

  /**
   * Move to adjacent grid position
   */
  moveToDirection(direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down'): GridPosition {
    switch (direction) {
      case 'north': return this.moveBy(0, 0, -1);
      case 'south': return this.moveBy(0, 0, 1);
      case 'east': return this.moveBy(1, 0, 0);
      case 'west': return this.moveBy(-1, 0, 0);
      case 'up': return this.moveBy(0, 1, 0);
      case 'down': return this.moveBy(0, -1, 0);
      default: return this;
    }
  }

  /**
   * Check equality with another GridPosition
   */
  equals(other: GridPosition): boolean {
    return this.x === other.x && this.y === other.y && this.z === other.z;
  }

  /**
   * Calculate Manhattan distance to another position
   */
  distanceTo(other: GridPosition): number {
    return Math.abs(this.x - other.x) + 
           Math.abs(this.y - other.y) + 
           Math.abs(this.z - other.z);
  }

  /**
   * Get string representation for keys and debugging
   */
  toString(): string {
    return `${this.x},${this.y},${this.z}`;
  }

  /**
   * Create GridPosition from string representation
   */
  static fromString(str: string): GridPosition {
    const parts = str.split(',').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      throw new Error(`Invalid GridPosition string: ${str}`);
    }
    return new GridPosition(parts[0], parts[1], parts[2]);
  }

  /**
   * Get all adjacent grid positions (6-directional)
   */
  getNeighbors(): GridPosition[] {
    return [
      this.moveToDirection('north'),
      this.moveToDirection('south'),
      this.moveToDirection('east'),
      this.moveToDirection('west'),
      this.moveToDirection('up'),
      this.moveToDirection('down'),
    ];
  }

  /**
   * Get horizontal neighbors only (same level)
   */
  getHorizontalNeighbors(): GridPosition[] {
    return [
      this.moveToDirection('north'),
      this.moveToDirection('south'),
      this.moveToDirection('east'),
      this.moveToDirection('west'),
    ];
  }

  /**
   * Get position directly below (for support checking)
   */
  getBelow(): GridPosition {
    return this.moveToDirection('down');
  }

  /**
   * Get position directly above
   */
  getAbove(): GridPosition {
    return this.moveToDirection('up');
  }

  /**
   * Check if position is at water level (y = 0)
   */
  isAtWaterLevel(): boolean {
    return this.y === 0;
  }

  /**
   * Check if position is elevated (y > 0)
   */
  isElevated(): boolean {
    return this.y > 0;
  }

  /**
   * Create array of positions in rectangular area
   */
  static getRectangularArea(
    topLeft: GridPosition,
    bottomRight: GridPosition
  ): GridPosition[] {
    const positions: GridPosition[] = [];
    
    const minX = Math.min(topLeft.x, bottomRight.x);
    const maxX = Math.max(topLeft.x, bottomRight.x);
    const minY = Math.min(topLeft.y, bottomRight.y);
    const maxY = Math.max(topLeft.y, bottomRight.y);
    const minZ = Math.min(topLeft.z, bottomRight.z);
    const maxZ = Math.max(topLeft.z, bottomRight.z);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          positions.push(new GridPosition(x, y, z));
        }
      }
    }

    return positions;
  }

  /**
   * Create JSON representation
   */
  toJSON(): { x: number; y: number; z: number } {
    return { x: this.x, y: this.y, z: this.z };
  }

  /**
   * Create GridPosition from JSON
   */
  static fromJSON(json: { x: number; y: number; z: number }): GridPosition {
    return new GridPosition(json.x, json.y, json.z);
  }
}