/**
 * Grid - Aggregate Root for Pontoon System
 * 
 * Central domain entity that orchestrates all pontoon operations
 * Provides pure functions with no side effects for reliable testing
 */

import { GridPosition } from './GridPosition';
import { Pontoon } from './Pontoon';
import { PhysicalDimensions } from './PhysicalDimensions';
import { PlacementValidator, GridState } from './PlacementValidator';
import { CoordinateCalculator } from './CoordinateCalculator';
import { 
  PontoonType, 
  PontoonColor, 
  PontoonId,
  GridDimensions,
  ValidationResult,
  Rotation,
  PhysicalPosition,
  WorldPosition
} from './PontoonTypes';

export class Grid {
  readonly dimensions: GridDimensions;
  readonly cellSize: PhysicalDimensions;
  readonly pontoons: Map<PontoonId, Pontoon>;
  
  // Services (stateless)
  private readonly validator: PlacementValidator;
  private readonly calculator: CoordinateCalculator;

  constructor(
    dimensions: GridDimensions,
    cellSize: PhysicalDimensions = PhysicalDimensions.SINGLE_PONTOON,
    pontoons: Map<PontoonId, Pontoon> = new Map()
  ) {
    // Validate inputs
    if (dimensions.width <= 0 || dimensions.height <= 0 || dimensions.levels <= 0) {
      throw new Error('Grid dimensions must be positive');
    }

    this.dimensions = dimensions;
    this.cellSize = cellSize;
    this.pontoons = new Map(pontoons); // Create defensive copy
    
    // Initialize services
    this.validator = new PlacementValidator();
    this.calculator = new CoordinateCalculator();
  }

  /**
   * Pure function: Check if pontoon can be placed at position
   */
  canPlacePontoon(position: GridPosition, type: PontoonType): boolean {
    const gridState = this.getGridState();
    const result = this.validator.canPlace(gridState, position, type);
    return result.valid;
  }

  /**
   * Pure function: Place pontoon and return new Grid instance
   */
  placePontoon(
    position: GridPosition,
    type: PontoonType,
    color: PontoonColor,
    rotation: Rotation = Rotation.NORTH
  ): Grid {
    const gridState = this.getGridState();
    const validationResult = this.validator.canPlace(gridState, position, type);
    
    if (!validationResult.valid) {
      throw new Error(
        `Cannot place pontoon: ${validationResult.errors.map(e => e.message).join(', ')}`
      );
    }

    // Create new pontoon
    const pontoon = Pontoon.create(position, type, color, rotation);
    
    // Create new pontoons map with added pontoon
    const newPontoons = new Map(this.pontoons);
    newPontoons.set(pontoon.id, pontoon);
    
    // Return new Grid instance (immutable)
    return new Grid(this.dimensions, this.cellSize, newPontoons);
  }

  /**
   * Pure function: Remove pontoon and return new Grid instance
   */
  removePontoon(pontoonId: PontoonId): Grid {
    if (!this.pontoons.has(pontoonId)) {
      throw new Error(`Pontoon ${pontoonId} not found`);
    }

    // Create new pontoons map without removed pontoon
    const newPontoons = new Map(this.pontoons);
    newPontoons.delete(pontoonId);
    
    // Return new Grid instance (immutable)
    return new Grid(this.dimensions, this.cellSize, newPontoons);
  }

  /**
   * Pure function: Remove pontoon at position and return new Grid instance
   */
  removePontoonAt(position: GridPosition): Grid {
    const pontoon = this.getPontoonAt(position);
    if (!pontoon) {
      throw new Error(`No pontoon found at position (${position.x}, ${position.y}, ${position.z})`);
    }

    return this.removePontoon(pontoon.id);
  }

  /**
   * Pure function: Move pontoon and return new Grid instance
   */
  movePontoon(pontoonId: PontoonId, newPosition: GridPosition): Grid {
    const pontoon = this.pontoons.get(pontoonId);
    if (!pontoon) {
      throw new Error(`Pontoon ${pontoonId} not found`);
    }

    const gridState = this.getGridState();
    const validationResult = this.validator.canMove(gridState, pontoonId, newPosition);
    
    if (!validationResult.valid) {
      throw new Error(
        `Cannot move pontoon: ${validationResult.errors.map(e => e.message).join(', ')}`
      );
    }

    // Create new pontoon with updated position
    const movedPontoon = pontoon.moveTo(newPosition);
    
    // Create new pontoons map with updated pontoon
    const newPontoons = new Map(this.pontoons);
    newPontoons.set(pontoonId, movedPontoon);
    
    // Return new Grid instance (immutable)
    return new Grid(this.dimensions, this.cellSize, newPontoons);
  }

  /**
   * Pure function: Update pontoon color and return new Grid instance
   */
  updatePontoonColor(pontoonId: PontoonId, color: PontoonColor): Grid {
    const pontoon = this.pontoons.get(pontoonId);
    if (!pontoon) {
      throw new Error(`Pontoon ${pontoonId} not found`);
    }

    // Create new pontoon with updated color
    const updatedPontoon = pontoon.withColor(color);
    
    // Create new pontoons map with updated pontoon
    const newPontoons = new Map(this.pontoons);
    newPontoons.set(pontoonId, updatedPontoon);
    
    // Return new Grid instance (immutable)
    return new Grid(this.dimensions, this.cellSize, newPontoons);
  }

  /**
   * Pure function: Rotate pontoon and return new Grid instance
   */
  rotatePontoon(pontoonId: PontoonId, rotation: Rotation): Grid {
    const pontoon = this.pontoons.get(pontoonId);
    if (!pontoon) {
      throw new Error(`Pontoon ${pontoonId} not found`);
    }

    // Create new pontoon with updated rotation
    const rotatedPontoon = pontoon.withRotation(rotation);
    
    // Create new pontoons map with updated pontoon
    const newPontoons = new Map(this.pontoons);
    newPontoons.set(pontoonId, rotatedPontoon);
    
    // Return new Grid instance (immutable)
    return new Grid(this.dimensions, this.cellSize, newPontoons);
  }

  /**
   * Query: Check if pontoon exists at position
   */
  hasPontoonAt(position: GridPosition): boolean {
    const gridState = this.getGridState();
    return this.validator.isPontoonAtPosition(gridState, position);
  }

  /**
   * Query: Get pontoon at position
   */
  getPontoonAt(position: GridPosition): Pontoon | null {
    const gridState = this.getGridState();
    return this.validator.getPontoonAtPosition(gridState, position);
  }

  /**
   * Query: Get all pontoons at specific level
   */
  getPontoonsAtLevel(level: number): Pontoon[] {
    return Array.from(this.pontoons.values())
      .filter(pontoon => pontoon.position.y === level);
  }

  /**
   * Query: Check if position has support
   */
  hasSupport(position: GridPosition): boolean {
    const gridState = this.getGridState();
    return this.validator.hasSupport(gridState, position);
  }

  /**
   * Query: Find valid positions near target
   */
  findNearbyValidPositions(
    targetPosition: GridPosition,
    type: PontoonType,
    maxDistance: number = 5
  ): GridPosition[] {
    const gridState = this.getGridState();
    return this.validator.findNearbyValidPositions(
      gridState,
      targetPosition,
      type,
      maxDistance
    );
  }

  /**
   * Validation: Check platform connectivity
   */
  validateConnectivity(): ValidationResult {
    const gridState = this.getGridState();
    return this.validator.validateConnectivity(gridState);
  }

  /**
   * Coordinate conversion: Grid to physical position
   */
  gridToPhysical(position: GridPosition): PhysicalPosition {
    return this.calculator.gridToPhysical(position, this.dimensions);
  }

  /**
   * Coordinate conversion: Grid to world position
   */
  gridToWorld(position: GridPosition): WorldPosition {
    return this.calculator.gridToWorld(position, this.dimensions);
  }

  /**
   * Query: Get total pontoon count
   */
  getPontoonCount(): number {
    return this.pontoons.size;
  }

  /**
   * Query: Get total occupied cells
   */
  getOccupiedCellCount(): number {
    let totalCells = 0;
    for (const pontoon of this.pontoons.values()) {
      totalCells += pontoon.getOccupiedPositions().length;
    }
    return totalCells;
  }

  /**
   * Query: Get physical center of grid
   */
  getPhysicalCenter(): PhysicalPosition {
    return {
      x: (this.dimensions.width * this.cellSize.widthMM) / 2,
      y: 0,
      z: (this.dimensions.height * this.cellSize.depthMM) / 2
    };
  }

  /**
   * Query: Get grid statistics
   */
  getStatistics(): {
    pontoonCount: number;
    occupiedCells: number;
    utilizationPercent: number;
    levelDistribution: Map<number, number>;
    typeDistribution: Map<PontoonType, number>;
    colorDistribution: Map<PontoonColor, number>;
  } {
    const levelDistribution = new Map<number, number>();
    const typeDistribution = new Map<PontoonType, number>();
    const colorDistribution = new Map<PontoonColor, number>();

    for (const pontoon of this.pontoons.values()) {
      // Level distribution
      const levelCount = levelDistribution.get(pontoon.position.y) || 0;
      levelDistribution.set(pontoon.position.y, levelCount + 1);

      // Type distribution
      const typeCount = typeDistribution.get(pontoon.type) || 0;
      typeDistribution.set(pontoon.type, typeCount + 1);

      // Color distribution
      const colorCount = colorDistribution.get(pontoon.color) || 0;
      colorDistribution.set(pontoon.color, colorCount + 1);
    }

    const totalGridCells = this.dimensions.width * this.dimensions.height * this.dimensions.levels;
    const occupiedCells = this.getOccupiedCellCount();

    return {
      pontoonCount: this.getPontoonCount(),
      occupiedCells,
      utilizationPercent: (occupiedCells / totalGridCells) * 100,
      levelDistribution,
      typeDistribution,
      colorDistribution
    };
  }

  /**
   * Create empty grid
   */
  static createEmpty(
    width: number,
    height: number,
    levels: number = 3
  ): Grid {
    const dimensions: GridDimensions = { width, height, levels };
    return new Grid(dimensions);
  }

  /**
   * Serialization: Convert to JSON
   */
  toJSON(): {
    dimensions: GridDimensions;
    cellSize: any;
    pontoons: any[];
  } {
    return {
      dimensions: this.dimensions,
      cellSize: this.cellSize.toJSON(),
      pontoons: Array.from(this.pontoons.values()).map(p => p.toJSON())
    };
  }

  /**
   * Deserialization: Create from JSON
   */
  static fromJSON(json: {
    dimensions: GridDimensions;
    cellSize: any;
    pontoons: any[];
  }): Grid {
    const pontoons = new Map<PontoonId, Pontoon>();
    
    for (const pontoonData of json.pontoons) {
      const pontoon = Pontoon.fromJSON(pontoonData);
      pontoons.set(pontoon.id, pontoon);
    }

    return new Grid(
      json.dimensions,
      PhysicalDimensions.fromJSON(json.cellSize),
      pontoons
    );
  }

  /**
   * Get grid state for validator
   */
  private getGridState(): GridState {
    return {
      pontoons: this.pontoons,
      gridDimensions: this.dimensions
    };
  }
}