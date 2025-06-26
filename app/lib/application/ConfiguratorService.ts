/**
 * ConfiguratorService - Application Layer Orchestration
 * 
 * Central service that orchestrates all grid operations
 * Provides high-level operations for the UI layer
 */

import { 
  Grid,
  GridPosition,
  Pontoon,
  PontoonType,
  PontoonColor,
  PontoonId,
  ValidationResult,
  Rotation,
  CoordinateCalculator,
  PlacementValidator
} from '../domain';
import * as THREE from 'three';

export interface Operation {
  type: string;
  id: string;
  timestamp: number;
  data: any;
}

export interface OperationResult {
  success: boolean;
  grid?: Grid;
  operation?: Operation;
  errors?: string[];
}

export interface MultiPlacementOptions {
  positions: GridPosition[];
  type: PontoonType;
  color: PontoonColor;
  rotation?: Rotation;
  skipInvalid?: boolean;
}

export interface BatchOperationResult {
  success: boolean;
  grid?: Grid;
  operations: Operation[];
  successCount: number;
  failureCount: number;
  errors: string[];
}

export class ConfiguratorService {
  private calculator: CoordinateCalculator;
  private validator: PlacementValidator;

  constructor() {
    this.calculator = new CoordinateCalculator();
    this.validator = new PlacementValidator();
  }

  /**
   * Place single pontoon with full validation and operation tracking
   */
  placePontoon(
    grid: Grid,
    position: GridPosition,
    type: PontoonType,
    color: PontoonColor,
    rotation: Rotation = Rotation.NORTH
  ): OperationResult {
    try {
      // Validate placement
      const validation = this.validatePlacement(grid, position, type);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors.map(e => e.message)
        };
      }

      // Execute placement
      const newGrid = grid.placePontoon(position, type, color, rotation);
      
      // Create operation record
      const operation: Operation = {
        type: 'PLACE_PONTOON',
        id: this.generateOperationId(),
        timestamp: Date.now(),
        data: {
          position: position.toJSON(),
          type,
          color,
          rotation,
          pontoonId: Array.from(newGrid.pontoons.keys()).find(
            id => !grid.pontoons.has(id)
          )
        }
      };

      return {
        success: true,
        grid: newGrid,
        operation
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Remove pontoon with operation tracking
   */
  removePontoon(grid: Grid, pontoonId: PontoonId): OperationResult {
    try {
      const pontoon = grid.pontoons.get(pontoonId);
      if (!pontoon) {
        return {
          success: false,
          errors: [`Pontoon ${pontoonId} not found`]
        };
      }

      // Execute removal
      const newGrid = grid.removePontoon(pontoonId);
      
      // Create operation record
      const operation: Operation = {
        type: 'REMOVE_PONTOON',
        id: this.generateOperationId(),
        timestamp: Date.now(),
        data: {
          pontoonId,
          pontoonData: pontoon.toJSON() // Store for undo
        }
      };

      return {
        success: true,
        grid: newGrid,
        operation
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Move pontoon with validation and operation tracking
   */
  movePontoon(
    grid: Grid,
    pontoonId: PontoonId,
    newPosition: GridPosition
  ): OperationResult {
    try {
      const pontoon = grid.pontoons.get(pontoonId);
      if (!pontoon) {
        return {
          success: false,
          errors: [`Pontoon ${pontoonId} not found`]
        };
      }

      // Validate move
      const gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
      const validation = this.validator.canMove(gridState, pontoonId, newPosition);
      
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors.map(e => e.message)
        };
      }

      // Execute move
      const newGrid = grid.movePontoon(pontoonId, newPosition);
      
      // Create operation record
      const operation: Operation = {
        type: 'MOVE_PONTOON',
        id: this.generateOperationId(),
        timestamp: Date.now(),
        data: {
          pontoonId,
          oldPosition: pontoon.position.toJSON(),
          newPosition: newPosition.toJSON()
        }
      };

      return {
        success: true,
        grid: newGrid,
        operation
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Batch placement for multi-drop operations
   */
  placePontoonsBatch(
    grid: Grid,
    options: MultiPlacementOptions
  ): BatchOperationResult {
    const operations: Operation[] = [];
    const errors: string[] = [];
    let currentGrid = grid;
    let successCount = 0;
    let failureCount = 0;

    for (const position of options.positions) {
      const result = this.placePontoon(
        currentGrid,
        position,
        options.type,
        options.color,
        options.rotation
      );

      if (result.success && result.grid && result.operation) {
        currentGrid = result.grid;
        operations.push(result.operation);
        successCount++;
      } else {
        failureCount++;
        errors.push(...(result.errors || []));
        
        // Skip invalid positions if requested
        if (!options.skipInvalid) {
          break;
        }
      }
    }

    // Create batch operation record
    const batchOperation: Operation = {
      type: 'BATCH_PLACE_PONTOONS',
      id: this.generateOperationId(),
      timestamp: Date.now(),
      data: {
        options,
        operations: operations.map(op => op.id),
        successCount,
        failureCount
      }
    };

    operations.push(batchOperation);

    return {
      success: successCount > 0,
      grid: currentGrid,
      operations,
      successCount,
      failureCount,
      errors
    };
  }

  /**
   * Remove multiple pontoons
   */
  removePontoonsBatch(grid: Grid, pontoonIds: PontoonId[]): BatchOperationResult {
    const operations: Operation[] = [];
    const errors: string[] = [];
    let currentGrid = grid;
    let successCount = 0;
    let failureCount = 0;

    for (const pontoonId of pontoonIds) {
      const result = this.removePontoon(currentGrid, pontoonId);

      if (result.success && result.grid && result.operation) {
        currentGrid = result.grid;
        operations.push(result.operation);
        successCount++;
      } else {
        failureCount++;
        errors.push(...(result.errors || []));
      }
    }

    // Create batch operation record
    const batchOperation: Operation = {
      type: 'BATCH_REMOVE_PONTOONS',
      id: this.generateOperationId(),
      timestamp: Date.now(),
      data: {
        pontoonIds,
        operations: operations.map(op => op.id),
        successCount,
        failureCount
      }
    };

    operations.push(batchOperation);

    return {
      success: successCount > 0,
      grid: currentGrid,
      operations,
      successCount,
      failureCount,
      errors
    };
  }

  /**
   * Screen coordinate to grid position conversion
   */
  screenToGrid(
    screenX: number,
    screenY: number,
    camera: THREE.Camera,
    viewport: { width: number; height: number },
    grid: Grid,
    currentLevel: number
  ): GridPosition | null {
    return this.calculator.screenToGrid(
      { x: screenX, y: screenY },
      camera,
      viewport,
      grid.dimensions,
      currentLevel
    );
  }

  /**
   * Comprehensive placement validation
   */
  validatePlacement(
    grid: Grid,
    position: GridPosition,
    type: PontoonType,
    excludeId?: PontoonId
  ): ValidationResult {
    const gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
    return this.validator.canPlace(gridState, position, type, excludeId);
  }

  /**
   * Check if position has support
   */
  hasSupport(grid: Grid, position: GridPosition): boolean {
    const gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
    return this.validator.hasSupport(gridState, position);
  }

  /**
   * Find optimal placement positions near target
   */
  findNearbyValidPositions(
    grid: Grid,
    targetPosition: GridPosition,
    type: PontoonType,
    maxDistance: number = 5
  ): GridPosition[] {
    const gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
    return this.validator.findNearbyValidPositions(
      gridState,
      targetPosition,
      type,
      maxDistance
    );
  }

  /**
   * Validate platform connectivity
   */
  validateConnectivity(grid: Grid): ValidationResult {
    const gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
    return this.validator.validateConnectivity(gridState);
  }

  /**
   * Get pontoon at position
   */
  getPontoonAt(grid: Grid, position: GridPosition): Pontoon | null {
    return grid.getPontoonAt(position);
  }

  /**
   * Get all pontoons at level
   */
  getPontoonsAtLevel(grid: Grid, level: number): Pontoon[] {
    return grid.getPontoonsAtLevel(level);
  }

  /**
   * Calculate grid utilization statistics
   */
  calculateStatistics(grid: Grid): {
    pontoonCount: number;
    occupiedCells: number;
    utilizationPercent: number;
    levelDistribution: Map<number, number>;
    typeDistribution: Map<PontoonType, number>;
    colorDistribution: Map<PontoonColor, number>;
    totalVolume: number;
    estimatedWeight: number;
  } {
    const baseStats = grid.getStatistics();
    
    // Calculate additional metrics
    let totalVolume = 0;
    let estimatedWeight = 0;
    
    for (const pontoon of grid.pontoons.values()) {
      totalVolume += pontoon.physicalDimensions.volumeM3;
      // Estimate weight based on volume (assuming typical pontoon density)
      estimatedWeight += pontoon.physicalDimensions.volumeM3 * 100; // kg per m³
    }

    return {
      ...baseStats,
      totalVolume,
      estimatedWeight
    };
  }

  /**
   * Export grid data for manufacturing
   */
  exportForManufacturing(grid: Grid): {
    metadata: {
      exportTime: string;
      gridDimensions: any;
      totalPontoons: number;
      totalVolume: number;
    };
    pontoons: Array<{
      id: string;
      type: string;
      color: string;
      position: { x: number; y: number; z: number };
      physicalPosition: { x: number; y: number; z: number };
      dimensions: { widthMM: number; heightMM: number; depthMM: number };
    }>;
    materialList: Array<{
      type: string;
      color: string;
      count: number;
      totalVolume: number;
    }>;
  } {
    const stats = this.calculateStatistics(grid);
    const pontoons: any[] = [];
    const materialCounts = new Map<string, { count: number; volume: number }>();

    // Process each pontoon
    for (const pontoon of grid.pontoons.values()) {
      const physicalPos = grid.gridToPhysical(pontoon.position);
      
      pontoons.push({
        id: pontoon.id,
        type: pontoon.type,
        color: pontoon.color,
        position: pontoon.position.toJSON(),
        physicalPosition: {
          x: physicalPos.x,
          y: physicalPos.y,
          z: physicalPos.z
        },
        dimensions: pontoon.physicalDimensions.toJSON()
      });

      // Track materials
      const materialKey = `${pontoon.type}-${pontoon.color}`;
      const existing = materialCounts.get(materialKey) || { count: 0, volume: 0 };
      materialCounts.set(materialKey, {
        count: existing.count + 1,
        volume: existing.volume + pontoon.physicalDimensions.volumeM3
      });
    }

    // Create material list
    const materialList = Array.from(materialCounts.entries()).map(([key, data]) => {
      const [type, color] = key.split('-');
      return {
        type,
        color,
        count: data.count,
        totalVolume: data.volume
      };
    });

    return {
      metadata: {
        exportTime: new Date().toISOString(),
        gridDimensions: grid.dimensions,
        totalPontoons: stats.pontoonCount,
        totalVolume: stats.totalVolume
      },
      pontoons,
      materialList
    };
  }

  /**
   * Clear calculator cache for performance
   */
  clearCache(): void {
    this.calculator.clearCache();
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    calculatorCache: { size: number; memoryUsage: number };
  } {
    return {
      calculatorCache: this.calculator.getCacheStats()
    };
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}