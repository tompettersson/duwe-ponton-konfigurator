/**
 * EventPipeline - Linear Event Processing System
 * 
 * Ensures all user interactions follow the same predictable flow:
 * User Input → Coordinate Calculation → Validation → State Update → Rendering
 */

import * as THREE from 'three';
import { 
  Grid,
  GridPosition,
  PontoonType,
  PontoonColor,
  CoordinateCalculator,
  ValidationResult
} from '../domain';
import { ConfiguratorService, Operation, OperationResult } from './ConfiguratorService';
import { PreviewService, HoverFeedback } from './PreviewService';
import { HistoryService } from './HistoryService';

export interface UserInput {
  type: 'mouse_move' | 'mouse_click' | 'mouse_down' | 'mouse_up' | 'key_press';
  screenX: number;
  screenY: number;
  button?: number;
  key?: string;
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
  };
  timestamp: number;
}

export interface ProcessingContext {
  grid: Grid;
  camera: THREE.Camera;
  viewport: { width: number; height: number };
  currentLevel: number;
  currentTool: string;
  currentPontoonType: PontoonType;
  currentPontoonColor: PontoonColor;
}

export interface ProcessingResult {
  success: boolean;
  type: 'hover' | 'placement' | 'selection' | 'multi_drop' | 'none';
  gridPosition: GridPosition | null;
  newGrid?: Grid;
  operations?: Operation[];
  hoverFeedback?: HoverFeedback;
  previewUpdate?: boolean;
  errors?: string[];
  debugInfo: {
    inputProcessed: boolean;
    coordinateCalculated: boolean;
    validationPerformed: boolean;
    operationExecuted: boolean;
    processingTimeMs: number;
  };
}

export class EventPipeline {
  private calculator: CoordinateCalculator;
  private configurator: ConfiguratorService;
  private preview: PreviewService;
  private history: HistoryService;

  // Pipeline state
  private isProcessing: boolean = false;
  private lastProcessedInput: UserInput | null = null;
  private processingStats = {
    totalEvents: 0,
    successfulEvents: 0,
    failedEvents: 0,
    averageProcessingTime: 0
  };

  constructor() {
    this.calculator = new CoordinateCalculator();
    this.configurator = new ConfiguratorService();
    this.preview = new PreviewService();
    this.history = new HistoryService();
  }

  /**
   * MAIN PIPELINE: Process user input through linear flow
   */
  async processInput(
    input: UserInput,
    context: ProcessingContext
  ): Promise<ProcessingResult> {
    const startTime = performance.now();
    
    // Prevent concurrent processing
    if (this.isProcessing) {
      console.warn('🚫 EventPipeline: Dropping input - pipeline busy');
      return this.createFailureResult('Pipeline busy', startTime);
    }

    this.isProcessing = true;
    this.processingStats.totalEvents++;

    try {
      console.log(`🎯 EventPipeline: Processing ${input.type} at (${input.screenX}, ${input.screenY})`);

      // STEP 1: Coordinate Calculation
      const gridPosition = this.calculateCoordinates(input, context);
      
      if (!gridPosition) {
        console.warn('❌ EventPipeline: Coordinate calculation failed');
        return this.createFailureResult('Coordinate calculation failed', startTime);
      }

      // STEP 2: Input Type Processing
      let result: ProcessingResult;
      
      switch (input.type) {
        case 'mouse_move':
          result = await this.processHover(gridPosition, context, startTime);
          break;
          
        case 'mouse_click':
          result = await this.processClick(gridPosition, context, startTime);
          break;
          
        case 'mouse_down':
          result = await this.processMouseDown(gridPosition, context, startTime);
          break;
          
        case 'mouse_up':
          result = await this.processMouseUp(gridPosition, context, startTime);
          break;
          
        case 'key_press':
          result = await this.processKeyPress(input, gridPosition, context, startTime);
          break;
          
        default:
          result = this.createFailureResult(`Unknown input type: ${input.type}`, startTime);
      }

      // Update statistics
      if (result.success) {
        this.processingStats.successfulEvents++;
      } else {
        this.processingStats.failedEvents++;
      }

      const processingTime = performance.now() - startTime;
      this.processingStats.averageProcessingTime = 
        (this.processingStats.averageProcessingTime * (this.processingStats.totalEvents - 1) + processingTime) 
        / this.processingStats.totalEvents;

      this.lastProcessedInput = input;
      return result;

    } catch (error) {
      console.error('💥 EventPipeline: Processing error:', error);
      this.processingStats.failedEvents++;
      return this.createFailureResult(
        error instanceof Error ? error.message : 'Unknown error',
        startTime
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * STEP 1: Coordinate Calculation (Single Authority)
   */
  private calculateCoordinates(
    input: UserInput,
    context: ProcessingContext
  ): GridPosition | null {
    return this.calculator.screenToGrid(
      { x: input.screenX, y: input.screenY },
      context.camera,
      context.viewport,
      context.grid.dimensions,
      context.currentLevel
    );
  }

  /**
   * Process hover events (mouse_move)
   */
  private async processHover(
    gridPosition: GridPosition,
    context: ProcessingContext,
    startTime: number
  ): Promise<ProcessingResult> {
    // STEP 3: Update Preview
    const previewState = this.preview.updatePreview(
      context.grid,
      gridPosition,
      context.currentPontoonType,
      context.currentPontoonColor
    );

    // STEP 4: Get Hover Feedback
    const hoverFeedback = this.preview.getHoverFeedback(
      context.grid,
      gridPosition,
      context.currentPontoonType
    );

    return {
      success: true,
      type: 'hover',
      gridPosition,
      hoverFeedback,
      previewUpdate: true,
      debugInfo: {
        inputProcessed: true,
        coordinateCalculated: true,
        validationPerformed: true,
        operationExecuted: false,
        processingTimeMs: performance.now() - startTime
      }
    };
  }

  /**
   * Process click events (mouse_click)
   */
  private async processClick(
    gridPosition: GridPosition,
    context: ProcessingContext,
    startTime: number
  ): Promise<ProcessingResult> {
    // Route to appropriate tool handler
    switch (context.currentTool) {
      case 'place':
        return this.processPlacement(gridPosition, context, startTime);
        
      case 'select':
        return this.processSelection(gridPosition, context, startTime);
        
      case 'delete':
        return this.processDeletion(gridPosition, context, startTime);
        
      case 'rotate':
        return this.processRotation(gridPosition, context, startTime);
        
      case 'paint':
        return this.processPaint(gridPosition, context, startTime);
        
      case 'move':
        return this.processMove(gridPosition, context, startTime);
        
      default:
        return this.createFailureResult(`Unknown tool: ${context.currentTool}`, startTime);
    }
  }

  /**
   * Process pontoon placement
   */
  private async processPlacement(
    gridPosition: GridPosition,
    context: ProcessingContext,
    startTime: number
  ): Promise<ProcessingResult> {
    // STEP 3: Validation
    const validation = this.configurator.validatePlacement(
      context.grid,
      gridPosition,
      context.currentPontoonType
    );

    if (!validation.valid) {
      console.warn('❌ EventPipeline: Placement validation failed:', validation.errors);
      return {
        success: false,
        type: 'placement',
        gridPosition,
        errors: validation.errors.map(e => e.message),
        debugInfo: {
          inputProcessed: true,
          coordinateCalculated: true,
          validationPerformed: true,
          operationExecuted: false,
          processingTimeMs: performance.now() - startTime
        }
      };
    }

    // STEP 4: Execute Operation
    const result = this.configurator.placePontoon(
      context.grid,
      gridPosition,
      context.currentPontoonType,
      context.currentPontoonColor
    );

    if (!result.success || !result.grid || !result.operation) {
      console.warn('❌ EventPipeline: Placement operation failed:', result.errors);
      return {
        success: false,
        type: 'placement',
        gridPosition,
        errors: result.errors,
        debugInfo: {
          inputProcessed: true,
          coordinateCalculated: true,
          validationPerformed: true,
          operationExecuted: false,
          processingTimeMs: performance.now() - startTime
        }
      };
    }

    // STEP 5: Update History
    this.history.addEntry(
      context.grid,
      result.grid,
      [result.operation],
      `Place ${context.currentPontoonType} pontoon`
    );

    console.log('✅ EventPipeline: Pontoon placed successfully at', gridPosition.toString());

    return {
      success: true,
      type: 'placement',
      gridPosition,
      newGrid: result.grid,
      operations: [result.operation],
      debugInfo: {
        inputProcessed: true,
        coordinateCalculated: true,
        validationPerformed: true,
        operationExecuted: true,
        processingTimeMs: performance.now() - startTime
      }
    };
  }

  /**
   * Process pontoon selection - Enhanced with ToolSystem integration
   */
  private async processSelection(
    gridPosition: GridPosition,
    context: ProcessingContext,
    startTime: number
  ): Promise<ProcessingResult> {
    const pontoon = this.configurator.getPontoonAt(context.grid, gridPosition);

    if (!pontoon) {
      // Click on empty space - clear selection unless Ctrl is held
      // For now, always clear selection on empty space
      return {
        success: true,
        type: 'selection',
        gridPosition,
        operations: [{
          type: 'CLEAR_SELECTION',
          id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          data: { cleared: true }
        }],
        debugInfo: {
          inputProcessed: true,
          coordinateCalculated: true,
          validationPerformed: true,
          operationExecuted: true,
          processingTimeMs: performance.now() - startTime
        }
      };
    }

    // Handle selection of existing pontoon
    // This will be passed to the UI layer to update selection state
    const operation = {
      type: 'TOGGLE_SELECTION',
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      data: { 
        pontoonId: pontoon.id,
        gridPosition: gridPosition.toString(),
        pontoonType: pontoon.type,
        pontoonColor: pontoon.color
      }
    };

    console.log('✅ EventPipeline: Pontoon selection toggled:', pontoon.id);

    return {
      success: true,
      type: 'selection',
      gridPosition,
      operations: [operation],
      debugInfo: {
        inputProcessed: true,
        coordinateCalculated: true,
        validationPerformed: true,
        operationExecuted: true,
        processingTimeMs: performance.now() - startTime
      }
    };
  }

  /**
   * Process pontoon deletion
   */
  private async processDeletion(
    gridPosition: GridPosition,
    context: ProcessingContext,
    startTime: number
  ): Promise<ProcessingResult> {
    const pontoon = this.configurator.getPontoonAt(context.grid, gridPosition);

    if (!pontoon) {
      return {
        success: false,
        type: 'selection',
        gridPosition,
        errors: ['No pontoon to delete at this position'],
        debugInfo: {
          inputProcessed: true,
          coordinateCalculated: true,
          validationPerformed: true,
          operationExecuted: false,
          processingTimeMs: performance.now() - startTime
        }
      };
    }

    // Execute deletion
    const result = this.configurator.removePontoon(context.grid, pontoon.id);

    if (!result.success || !result.grid || !result.operation) {
      return {
        success: false,
        type: 'selection',
        gridPosition,
        errors: result.errors,
        debugInfo: {
          inputProcessed: true,
          coordinateCalculated: true,
          validationPerformed: true,
          operationExecuted: false,
          processingTimeMs: performance.now() - startTime
        }
      };
    }

    // Update history
    this.history.addEntry(
      context.grid,
      result.grid,
      [result.operation],
      `Delete pontoon`
    );

    console.log('✅ EventPipeline: Pontoon deleted:', pontoon.id);

    return {
      success: true,
      type: 'selection',
      gridPosition,
      newGrid: result.grid,
      operations: [result.operation],
      debugInfo: {
        inputProcessed: true,
        coordinateCalculated: true,
        validationPerformed: true,
        operationExecuted: true,
        processingTimeMs: performance.now() - startTime
      }
    };
  }

  /**
   * Process pontoon rotation
   */
  private async processRotation(
    gridPosition: GridPosition,
    context: ProcessingContext,
    startTime: number
  ): Promise<ProcessingResult> {
    const pontoon = this.configurator.getPontoonAt(context.grid, gridPosition);

    if (!pontoon) {
      return {
        success: false,
        type: 'selection',
        gridPosition,
        errors: ['No pontoon to rotate at this position'],
        debugInfo: {
          inputProcessed: true,
          coordinateCalculated: true,
          validationPerformed: true,
          operationExecuted: false,
          processingTimeMs: performance.now() - startTime
        }
      };
    }

    // Calculate new rotation
    const newRotation = (pontoon.rotation + 90) % 360;
    
    try {
      const newGrid = context.grid.rotatePontoon(pontoon.id, newRotation);
      
      // Create operation for history
      const operation = {
        type: 'ROTATE_PONTOON',
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        data: {
          pontoonId: pontoon.id,
          oldRotation: pontoon.rotation,
          newRotation
        }
      };

      // Update history
      this.history.addEntry(
        context.grid,
        newGrid,
        [operation],
        `Rotate pontoon`
      );

      console.log('✅ EventPipeline: Pontoon rotated:', pontoon.id, 'to', newRotation);

      return {
        success: true,
        type: 'selection',
        gridPosition,
        newGrid,
        operations: [operation],
        debugInfo: {
          inputProcessed: true,
          coordinateCalculated: true,
          validationPerformed: true,
          operationExecuted: true,
          processingTimeMs: performance.now() - startTime
        }
      };
    } catch (error) {
      return {
        success: false,
        type: 'selection',
        gridPosition,
        errors: [error instanceof Error ? error.message : 'Rotation failed'],
        debugInfo: {
          inputProcessed: true,
          coordinateCalculated: true,
          validationPerformed: true,
          operationExecuted: false,
          processingTimeMs: performance.now() - startTime
        }
      };
    }
  }

  /**
   * Process pontoon paint/color change
   */
  private async processPaint(
    gridPosition: GridPosition,
    context: ProcessingContext,
    startTime: number
  ): Promise<ProcessingResult> {
    const pontoon = this.configurator.getPontoonAt(context.grid, gridPosition);

    if (!pontoon) {
      return {
        success: false,
        type: 'selection',
        gridPosition,
        errors: ['No pontoon to paint at this position'],
        debugInfo: {
          inputProcessed: true,
          coordinateCalculated: true,
          validationPerformed: true,
          operationExecuted: false,
          processingTimeMs: performance.now() - startTime
        }
      };
    }

    if (pontoon.color === context.currentPontoonColor) {
      return {
        success: false,
        type: 'selection',
        gridPosition,
        errors: ['Pontoon already has this color'],
        debugInfo: {
          inputProcessed: true,
          coordinateCalculated: true,
          validationPerformed: true,
          operationExecuted: false,
          processingTimeMs: performance.now() - startTime
        }
      };
    }

    try {
      const newGrid = context.grid.updatePontoonColor(pontoon.id, context.currentPontoonColor);
      
      // Create operation for history
      const operation = {
        type: 'PAINT_PONTOON',
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        data: {
          pontoonId: pontoon.id,
          oldColor: pontoon.color,
          newColor: context.currentPontoonColor
        }
      };

      // Update history
      this.history.addEntry(
        context.grid,
        newGrid,
        [operation],
        `Paint pontoon`
      );

      console.log('✅ EventPipeline: Pontoon painted:', pontoon.id, 'to', context.currentPontoonColor);

      return {
        success: true,
        type: 'selection',
        gridPosition,
        newGrid,
        operations: [operation],
        debugInfo: {
          inputProcessed: true,
          coordinateCalculated: true,
          validationPerformed: true,
          operationExecuted: true,
          processingTimeMs: performance.now() - startTime
        }
      };
    } catch (error) {
      return {
        success: false,
        type: 'selection',
        gridPosition,
        errors: [error instanceof Error ? error.message : 'Paint failed'],
        debugInfo: {
          inputProcessed: true,
          coordinateCalculated: true,
          validationPerformed: true,
          operationExecuted: false,
          processingTimeMs: performance.now() - startTime
        }
      };
    }
  }

  /**
   * Process pontoon move - Two-click pattern (select then move)
   */
  private async processMove(
    gridPosition: GridPosition,
    context: ProcessingContext,
    startTime: number
  ): Promise<ProcessingResult> {
    // Note: This is a simplified implementation. In a full implementation,
    // the move state would be managed by the UI layer or a dedicated move service
    
    // For now, we'll check if there's a single selected pontoon to move
    const selectedPontoons = Array.from(context.selectedPontoonIds || []);
    
    if (selectedPontoons.length === 0) {
      // No pontoon selected - try to select one at the clicked position
      const pontoon = this.configurator.getPontoonAt(context.grid, gridPosition);
      if (!pontoon) {
        return {
          success: false,
          type: 'selection',
          gridPosition,
          errors: ['No pontoon to move at this position. Click on a pontoon first.'],
          debugInfo: {
            inputProcessed: true,
            coordinateCalculated: true,
            validationPerformed: true,
            operationExecuted: false,
            processingTimeMs: performance.now() - startTime
          }
        };
      }
      
      // Select the pontoon for moving
      const operation = {
        type: 'SELECT_FOR_MOVE',
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        data: { 
          pontoonId: pontoon.id,
          gridPosition: gridPosition.toString(),
          action: 'selected_for_move'
        }
      };
      
      console.log('✅ EventPipeline: Pontoon selected for move:', pontoon.id);
      
      return {
        success: true,
        type: 'selection',
        gridPosition,
        operations: [operation],
        debugInfo: {
          inputProcessed: true,
          coordinateCalculated: true,
          validationPerformed: true,
          operationExecuted: true,
          processingTimeMs: performance.now() - startTime
        }
      };
    }
    
    if (selectedPontoons.length === 1) {
      // One pontoon selected - move it to the clicked position
      const pontoonId = selectedPontoons[0];
      const pontoon = context.grid.pontoons.get(pontoonId);
      
      if (!pontoon) {
        return {
          success: false,
          type: 'selection',
          gridPosition,
          errors: ['Selected pontoon not found'],
          debugInfo: {
            inputProcessed: true,
            coordinateCalculated: true,
            validationPerformed: true,
            operationExecuted: false,
            processingTimeMs: performance.now() - startTime
          }
        };
      }
      
      // Check if we're trying to move to the same position
      if (pontoon.position.equals(gridPosition)) {
        return {
          success: false,
          type: 'selection',
          gridPosition,
          errors: ['Pontoon is already at this position'],
          debugInfo: {
            inputProcessed: true,
            coordinateCalculated: true,
            validationPerformed: true,
            operationExecuted: false,
            processingTimeMs: performance.now() - startTime
          }
        };
      }
      
      try {
        // Execute the move operation
        const result = this.configurator.movePontoon(context.grid, pontoonId, gridPosition);
        
        if (!result.success || !result.grid || !result.operation) {
          return {
            success: false,
            type: 'selection',
            gridPosition,
            errors: result.errors || ['Move operation failed'],
            debugInfo: {
              inputProcessed: true,
              coordinateCalculated: true,
              validationPerformed: true,
              operationExecuted: false,
              processingTimeMs: performance.now() - startTime
            }
          };
        }
        
        // Update history
        this.history.addEntry(
          context.grid,
          result.grid,
          [result.operation],
          `Move pontoon from ${pontoon.position.toString()} to ${gridPosition.toString()}`
        );
        
        // Create operation for clearing selection after move
        const clearSelectionOperation = {
          type: 'CLEAR_SELECTION_AFTER_MOVE',
          id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          data: { 
            movedPontoonId: pontoonId,
            fromPosition: pontoon.position.toString(),
            toPosition: gridPosition.toString()
          }
        };
        
        console.log('✅ EventPipeline: Pontoon moved successfully:', pontoonId, 'to', gridPosition.toString());
        
        return {
          success: true,
          type: 'selection',
          gridPosition,
          newGrid: result.grid,
          operations: [result.operation, clearSelectionOperation],
          debugInfo: {
            inputProcessed: true,
            coordinateCalculated: true,
            validationPerformed: true,
            operationExecuted: true,
            processingTimeMs: performance.now() - startTime
          }
        };
      } catch (error) {
        return {
          success: false,
          type: 'selection',
          gridPosition,
          errors: [error instanceof Error ? error.message : 'Move failed'],
          debugInfo: {
            inputProcessed: true,
            coordinateCalculated: true,
            validationPerformed: true,
            operationExecuted: false,
            processingTimeMs: performance.now() - startTime
          }
        };
      }
    }
    
    // Multiple pontoons selected - not supported for move
    return {
      success: false,
      type: 'selection',
      gridPosition,
      errors: ['Cannot move multiple pontoons. Please select only one pontoon.'],
      debugInfo: {
        inputProcessed: true,
        coordinateCalculated: true,
        validationPerformed: true,
        operationExecuted: false,
        processingTimeMs: performance.now() - startTime
      }
    };
  }

  /**
   * Process mouse down events (for multi-drop)
   */
  private async processMouseDown(
    gridPosition: GridPosition,
    context: ProcessingContext,
    startTime: number
  ): Promise<ProcessingResult> {
    // Handle multi-drop tool
    if (context.currentTool === 'multi-drop') {
      console.log('🎯 EventPipeline: Starting multi-drop at', gridPosition.toString());
      return {
        success: true,
        type: 'multi_drop',
        gridPosition,
        debugInfo: {
          inputProcessed: true,
          coordinateCalculated: true,
          validationPerformed: false,
          operationExecuted: false,
          processingTimeMs: performance.now() - startTime
        }
      };
    }

    return this.createNoOpResult(gridPosition, startTime);
  }

  /**
   * Process mouse up events
   */
  private async processMouseUp(
    gridPosition: GridPosition,
    context: ProcessingContext,
    startTime: number
  ): Promise<ProcessingResult> {
    // Handle multi-drop completion
    if (context.currentTool === 'multi-drop') {
      console.log('🎯 EventPipeline: Completing multi-drop at', gridPosition.toString());
      return {
        success: true,
        type: 'multi_drop',
        gridPosition,
        debugInfo: {
          inputProcessed: true,
          coordinateCalculated: true,
          validationPerformed: false,
          operationExecuted: false,
          processingTimeMs: performance.now() - startTime
        }
      };
    }

    return this.createNoOpResult(gridPosition, startTime);
  }

  /**
   * Process key press events
   */
  private async processKeyPress(
    input: UserInput,
    gridPosition: GridPosition,
    context: ProcessingContext,
    startTime: number
  ): Promise<ProcessingResult> {
    // Handle keyboard shortcuts
    switch (input.key) {
      case 'Delete':
      case 'Backspace':
        if (gridPosition) {
          return this.processDeletion(gridPosition, context, startTime);
        }
        break;
        
      case 'z':
        if (input.modifiers.ctrl) {
          const previousGrid = this.history.undo();
          if (previousGrid) {
            console.log('↶ EventPipeline: Undo executed');
            return {
              success: true,
              type: 'none',
              gridPosition,
              newGrid: previousGrid,
              debugInfo: {
                inputProcessed: true,
                coordinateCalculated: false,
                validationPerformed: false,
                operationExecuted: true,
                processingTimeMs: performance.now() - startTime
              }
            };
          }
        }
        break;
        
      case 'y':
        if (input.modifiers.ctrl) {
          const nextGrid = this.history.redo();
          if (nextGrid) {
            console.log('↷ EventPipeline: Redo executed');
            return {
              success: true,
              type: 'none',
              gridPosition,
              newGrid: nextGrid,
              debugInfo: {
                inputProcessed: true,
                coordinateCalculated: false,
                validationPerformed: false,
                operationExecuted: true,
                processingTimeMs: performance.now() - startTime
              }
            };
          }
        }
        break;
    }

    return this.createNoOpResult(gridPosition, startTime);
  }

  /**
   * Get processing statistics
   */
  getStats(): {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    successRate: number;
    averageProcessingTime: number;
    isProcessing: boolean;
  } {
    return {
      ...this.processingStats,
      successRate: this.processingStats.totalEvents > 0 
        ? this.processingStats.successfulEvents / this.processingStats.totalEvents 
        : 0,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Get history service for external access
   */
  getHistoryService(): HistoryService {
    return this.history;
  }

  /**
   * Get preview service for external access
   */
  getPreviewService(): PreviewService {
    return this.preview;
  }

  /**
   * Clear all caches for performance
   */
  clearCaches(): void {
    this.calculator.clearCache();
    console.log('🧹 EventPipeline: Caches cleared');
  }

  /**
   * Create failure result
   */
  private createFailureResult(error: string, startTime: number): ProcessingResult {
    return {
      success: false,
      type: 'none',
      gridPosition: null,
      errors: [error],
      debugInfo: {
        inputProcessed: false,
        coordinateCalculated: false,
        validationPerformed: false,
        operationExecuted: false,
        processingTimeMs: performance.now() - startTime
      }
    };
  }

  /**
   * Create no-operation result
   */
  private createNoOpResult(gridPosition: GridPosition, startTime: number): ProcessingResult {
    return {
      success: true,
      type: 'none',
      gridPosition,
      debugInfo: {
        inputProcessed: true,
        coordinateCalculated: true,
        validationPerformed: false,
        operationExecuted: false,
        processingTimeMs: performance.now() - startTime
      }
    };
  }
}