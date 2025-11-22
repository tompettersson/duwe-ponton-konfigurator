/**
 * Pontoon - Domain Entity
 * 
 * Immutable entity representing a pontoon instance in the grid
 * Contains all pontoon-specific data and business logic
 */

import { GridPosition } from './GridPosition';
import { PhysicalDimensions } from './PhysicalDimensions';
import { 
  PontoonType, 
  PontoonColor, 
  Rotation, 
  PontoonId,
  getPontoonTypeConfig,
  getPontoonColorConfig,
  LugLayer,
  PONTOON_LUG_CONFIGS
} from './PontoonTypes';

export class Pontoon {
  readonly id: PontoonId;
  readonly position: GridPosition;
  readonly type: PontoonType;
  readonly color: PontoonColor;
  readonly rotation: Rotation;
  readonly physicalDimensions: PhysicalDimensions;

  constructor(
    id: PontoonId,
    position: GridPosition,
    type: PontoonType,
    color: PontoonColor,
    rotation: Rotation = Rotation.NORTH
  ) {
    // Validate inputs
    if (!id || id.trim() === '') {
      throw new Error('Pontoon ID cannot be empty');
    }

    this.id = id;
    this.position = position;
    this.type = type;
    this.color = color;
    this.rotation = rotation;
    this.physicalDimensions = getPontoonTypeConfig(type).dimensions;
  }

  /**
   * Create new pontoon with different position
   */
  moveTo(newPosition: GridPosition): Pontoon {
    return new Pontoon(
      this.id,
      newPosition,
      this.type,
      this.color,
      this.rotation
    );
  }

  /**
   * Create new pontoon with different color
   */
  withColor(newColor: PontoonColor): Pontoon {
    return new Pontoon(
      this.id,
      this.position,
      this.type,
      newColor,
      this.rotation
    );
  }

  /**
   * Create new pontoon with different rotation
   */
  withRotation(newRotation: Rotation): Pontoon {
    return new Pontoon(
      this.id,
      this.position,
      this.type,
      this.color,
      newRotation
    );
  }

  /**
   * Get all grid positions occupied by this pontoon
   */
  getOccupiedPositions(): GridPosition[] {
    const config = getPontoonTypeConfig(this.type);
    const positions: GridPosition[] = [];

    // Apply rotation to grid size
    let effectiveSize = { ...config.gridSize };
    if (this.rotation === Rotation.EAST || this.rotation === Rotation.WEST) {
      // Swap X and Z dimensions for 90/270 degree rotations
      effectiveSize = {
        x: config.gridSize.z,
        y: config.gridSize.y,
        z: config.gridSize.x
      };
    }

    for (let x = 0; x < effectiveSize.x; x++) {
      for (let y = 0; y < effectiveSize.y; y++) {
        for (let z = 0; z < effectiveSize.z; z++) {
          positions.push(this.position.moveBy(x, y, z));
        }
      }
    }

    return positions;
  }

  /**
   * Check if pontoon occupies specific grid position
   */
  occupiesPosition(position: GridPosition): boolean {
    return this.getOccupiedPositions().some(pos => pos.equals(position));
  }

  /**
   * Get bounding box in grid coordinates
   */
  getBoundingBox(): { min: GridPosition; max: GridPosition } {
    const config = getPontoonTypeConfig(this.type);
    
    // Apply rotation to grid size
    let effectiveSize = { ...config.gridSize };
    if (this.rotation === Rotation.EAST || this.rotation === Rotation.WEST) {
      // Swap X and Z dimensions for 90/270 degree rotations
      effectiveSize = {
        x: config.gridSize.z,
        y: config.gridSize.y,
        z: config.gridSize.x
      };
    }
    
    return {
      min: this.position,
      max: new GridPosition(
        this.position.x + effectiveSize.x - 1,
        this.position.y + effectiveSize.y - 1,
        this.position.z + effectiveSize.z - 1
      )
    };
  }

  /**
   * Get center position in grid coordinates
   */
  getCenterPosition(): GridPosition {
    const config = getPontoonTypeConfig(this.type);
    
    // Apply rotation to grid size
    let effectiveSize = { ...config.gridSize };
    if (this.rotation === Rotation.EAST || this.rotation === Rotation.WEST) {
      // Swap X and Z dimensions for 90/270 degree rotations
      effectiveSize = {
        x: config.gridSize.z,
        y: config.gridSize.y,
        z: config.gridSize.x
      };
    }
    
    return new GridPosition(
      this.position.x + Math.floor(effectiveSize.x / 2),
      this.position.y + Math.floor(effectiveSize.y / 2),
      this.position.z + Math.floor(effectiveSize.z / 2)
    );
  }

  /**
   * Check if pontoon is at water level
   */
  isAtWaterLevel(): boolean {
    return this.position.isAtWaterLevel();
  }

  /**
   * Check if pontoon is elevated
   */
  isElevated(): boolean {
    return this.position.isElevated();
  }

  /**
   * Get support positions (positions directly below)
   */
  getSupportPositions(): GridPosition[] {
    return this.getOccupiedPositions()
      .map(pos => pos.getBelow())
      .filter(pos => pos.y >= 0); // Only valid support positions
  }

  /**
   * Get display information
   */
  getDisplayInfo(): {
    name: string;
    colorName: string;
    colorHex: string;
    dimensions: string;
    level: number;
  } {
    const typeConfig = getPontoonTypeConfig(this.type);
    const colorConfig = getPontoonColorConfig(this.color);

    return {
      name: typeConfig.displayName,
      colorName: colorConfig.name,
      colorHex: colorConfig.hex,
      dimensions: this.physicalDimensions.toStringMeters(),
      level: this.position.y
    };
  }

  /**
   * Get the lug layer at a specific grid intersection (corner)
   * @param gridX The global grid X coordinate of the intersection
   * @param gridZ The global grid Z coordinate of the intersection
   */
  getLugLayerAt(gridX: number, gridZ: number): LugLayer | null {
    // 1. Calculate local coordinates relative to the pontoon's origin
    const localX = gridX - this.position.x;
    const localZ = gridZ - this.position.z;

    // 2. Get the unrotated config
    const config = getPontoonTypeConfig(this.type);
    const lugConfig = PONTOON_LUG_CONFIGS[this.type];
    
    // 3. Inverse rotate the local coordinates to match the NORTH-based config
    // We need to find which "original" corner corresponds to the requested (localX, localZ)
    
    let originalX = localX;
    let originalZ = localZ;
    
    // Grid dimensions for rotation (width/height in cells)
    // Note: Corners are indices 0..Size. So a size 1 pontoon has corners 0 and 1.
    const width = config.gridSize.x;
    const height = config.gridSize.z;

    switch (this.rotation) {
      case Rotation.EAST:
        // Rotate -90 degrees (or 270)
        // New X = Old Z
        // New Z = Width - Old X
        originalX = localZ;
        originalZ = width - localX;
        break;
      case Rotation.SOUTH:
        // Rotate 180
        // New X = Width - Old X
        // New Z = Height - Old Z
        originalX = width - localX;
        originalZ = height - localZ;
        break;
      case Rotation.WEST:
        // Rotate 90 (or -270)
        // New X = Height - Old Z
        // New Z = Old X
        originalX = height - localZ;
        originalZ = localX;
        break;
      case Rotation.NORTH:
      default:
        // No change
        break;
    }

    // 4. Lookup in config
    const key = `${originalX},${originalZ}`;
    const lug = lugConfig[key];

    return lug ? lug.layer : null;
  }

  /**
   * Check equality with another pontoon
   */
  equals(other: Pontoon): boolean {
    return this.id === other.id &&
           this.position.equals(other.position) &&
           this.type === other.type &&
           this.color === other.color &&
           this.rotation === other.rotation;
  }

  /**
   * Get string representation
   */
  toString(): string {
    const displayInfo = this.getDisplayInfo();
    return `${displayInfo.name} (${displayInfo.colorName}) at ${this.position.toString()}`;
  }

  /**
   * Create JSON representation for serialization
   */
  toJSON(): {
    id: string;
    position: { x: number; y: number; z: number };
    type: string;
    color: string;
    rotation: number;
  } {
    return {
      id: this.id,
      position: this.position.toJSON(),
      type: this.type,
      color: this.color,
      rotation: this.rotation
    };
  }

  /**
   * Create Pontoon from JSON
   */
  static fromJSON(json: {
    id: string;
    position: { x: number; y: number; z: number };
    type: string;
    color: string;
    rotation: number;
  }): Pontoon {
    return new Pontoon(
      json.id,
      GridPosition.fromJSON(json.position),
      json.type as PontoonType,
      json.color as PontoonColor,
      json.rotation as Rotation
    );
  }

  /**
   * Generate unique pontoon ID
   */
  static generateId(): PontoonId {
    return `pontoon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create new pontoon instance
   */
  static create(
    position: GridPosition,
    type: PontoonType,
    color: PontoonColor,
    rotation: Rotation = Rotation.NORTH
  ): Pontoon {
    return new Pontoon(
      Pontoon.generateId(),
      position,
      type,
      color,
      rotation
    );
  }
}