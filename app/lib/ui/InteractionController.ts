/**
 * InteractionController - UI Layer Integration
 * 
 * Bridges React events to the EventPipeline for consistent processing
 * Replaces the old InteractionManager with clean architecture
 */

import * as THREE from 'three';
import { 
  EventPipeline,
  UserInput,
  ProcessingContext,
  ProcessingResult
} from '../application';
import { 
  Grid,
  GridPosition,
  PontoonType,
  PontoonColor
} from '../domain';

export interface InteractionState {
  isHovering: boolean;
  isDragging: boolean;
  dragStart: GridPosition | null;
  dragEnd: GridPosition | null;
  lastHoverPosition: GridPosition | null;
  selectedPontoonIds: Set<string>;
}

export interface InteractionCallbacks {
  onGridUpdate: (grid: Grid) => void;
  onHoverUpdate: (position: GridPosition | null) => void;
  onSelectionUpdate: (selectedIds: Set<string>) => void;
  onPreviewUpdate: (hasPreview: boolean) => void;
  onError: (error: string) => void;
}

export class InteractionController {
  private pipeline: EventPipeline;
  private state: InteractionState;
  private callbacks: InteractionCallbacks;
  
  // Canvas reference for coordinate calculations
  private canvasRef: HTMLCanvasElement | null = null;
  
  // Processing statistics
  private stats = {
    totalInteractions: 0,
    successfulInteractions: 0,
    averageResponseTime: 0
  };

  constructor(callbacks: InteractionCallbacks) {
    this.pipeline = new EventPipeline();
    this.callbacks = callbacks;
    this.state = {
      isHovering: false,
      isDragging: false,
      dragStart: null,
      dragEnd: null,
      lastHoverPosition: null,
      selectedPontoonIds: new Set()
    };
  }

  /**
   * Initialize with canvas reference
   */
  initialize(canvas: HTMLCanvasElement): void {
    this.canvasRef = canvas;
    this.setupEventListeners();
    console.log('🎮 InteractionController: Initialized with canvas');
  }

  /**
   * Cleanup event listeners
   */
  cleanup(): void {
    if (this.canvasRef) {
      this.removeEventListeners();
      this.canvasRef = null;
    }
    console.log('🧹 InteractionController: Cleaned up');
  }

  /**
   * Process mouse move events
   */
  private async handleMouseMove(event: MouseEvent): Promise<void> {
    if (!this.canvasRef) return;

    const input = this.createUserInput('mouse_move', event);
    const context = this.getCurrentContext();
    
    const result = await this.pipeline.processInput(input, context);
    
    if (result.success && result.gridPosition) {
      this.state.lastHoverPosition = result.gridPosition;
      this.state.isHovering = true;
      
      // Update hover in UI
      this.callbacks.onHoverUpdate(result.gridPosition);
      
      // Update preview if available
      if (result.previewUpdate) {
        this.callbacks.onPreviewUpdate(true);
      }
    } else {
      this.state.isHovering = false;
      this.state.lastHoverPosition = null;
      this.callbacks.onHoverUpdate(null);
      this.callbacks.onPreviewUpdate(false);
    }

    this.updateStats(result);
  }

  /**
   * Process mouse click events
   */
  private async handleMouseClick(event: MouseEvent): Promise<void> {
    if (!this.canvasRef) return;

    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();

    const input = this.createUserInput('mouse_click', event);
    const context = this.getCurrentContext();
    
    const result = await this.pipeline.processInput(input, context);
    
    if (result.success) {
      // Handle grid updates
      if (result.newGrid) {
        this.callbacks.onGridUpdate(result.newGrid);
        console.log('✅ InteractionController: Grid updated via', result.type);
      }
      
      // Handle selection updates
      if (result.type === 'selection' && result.gridPosition) {
        this.updateSelection(result.gridPosition, event.ctrlKey || event.metaKey);
      }
    } else {
      // Handle errors
      const errorMessage = result.errors?.join(', ') || 'Unknown interaction error';
      this.callbacks.onError(errorMessage);
      console.warn('❌ InteractionController: Click failed:', errorMessage);
    }

    this.updateStats(result);
  }

  /**
   * Process mouse down events (for multi-drop)
   */
  private async handleMouseDown(event: MouseEvent): Promise<void> {
    if (!this.canvasRef) return;

    const input = this.createUserInput('mouse_down', event);
    const context = this.getCurrentContext();
    
    // Check if this is a multi-drop operation
    if (context.currentTool === 'multi-drop') {
      const result = await this.pipeline.processInput(input, context);
      
      if (result.success && result.gridPosition) {
        this.state.isDragging = true;
        this.state.dragStart = result.gridPosition;
        this.state.dragEnd = result.gridPosition;
        console.log('🎯 InteractionController: Multi-drop started at', result.gridPosition.toString());
      }
    }

    this.updateStats(await this.pipeline.processInput(input, context));
  }

  /**
   * Process mouse up events
   */
  private async handleMouseUp(event: MouseEvent): Promise<void> {
    if (!this.canvasRef) return;

    const input = this.createUserInput('mouse_up', event);
    const context = this.getCurrentContext();
    
    if (this.state.isDragging && context.currentTool === 'multi-drop') {
      // Execute multi-drop operation
      await this.executeMultiDrop();
      
      // Reset drag state
      this.state.isDragging = false;
      this.state.dragStart = null;
      this.state.dragEnd = null;
      
      console.log('🎯 InteractionController: Multi-drop completed');
    }

    this.updateStats(await this.pipeline.processInput(input, context));
  }

  /**
   * Process key press events
   */
  private async handleKeyPress(event: KeyboardEvent): Promise<void> {
    const input: UserInput = {
      type: 'key_press',
      screenX: 0,
      screenY: 0,
      key: event.key,
      modifiers: {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey
      },
      timestamp: Date.now()
    };

    const context = this.getCurrentContext();
    const result = await this.pipeline.processInput(input, context);
    
    if (result.success && result.newGrid) {
      this.callbacks.onGridUpdate(result.newGrid);
      console.log('✅ InteractionController: Grid updated via keyboard shortcut');
    }

    this.updateStats(result);
  }

  /**
   * Execute multi-drop operation
   */
  private async executeMultiDrop(): Promise<void> {
    if (!this.state.dragStart || !this.state.dragEnd) return;

    const context = this.getCurrentContext();
    
    // Get positions in rectangular area
    const positions = GridPosition.getRectangularArea(
      this.state.dragStart,
      this.state.dragEnd
    );

    // Filter positions for current level
    const levelPositions = positions.filter(pos => pos.y === context.currentLevel);

    // Filter for double pontoons (every other X position)
    let filteredPositions = levelPositions;
    if (context.currentPontoonType === PontoonType.DOUBLE) {
      const minX = Math.min(this.state.dragStart.x, this.state.dragEnd.x);
      filteredPositions = levelPositions.filter(pos => {
        const relativeX = pos.x - minX;
        return relativeX % 2 === 0;
      });
    }

    // Execute batch placement
    const configurator = new (await import('../application')).ConfiguratorService();
    const result = await configurator.placePontoonsBatch(context.grid, {
      positions: filteredPositions,
      type: context.currentPontoonType,
      color: context.currentPontoonColor,
      skipInvalid: true
    });

    if (result.success && result.grid) {
      this.callbacks.onGridUpdate(result.grid);
      console.log('✅ InteractionController: Multi-drop placed', result.successCount, 'pontoons');
      
      if (result.failureCount > 0) {
        this.callbacks.onError(`${result.failureCount} positions could not be placed`);
      }
    } else {
      this.callbacks.onError('Multi-drop operation failed');
    }
  }

  /**
   * Update selection state
   */
  private updateSelection(position: GridPosition, multiSelect: boolean): void {
    const context = this.getCurrentContext();
    const configurator = new (require('../application')).ConfiguratorService();
    const pontoon = configurator.getPontoonAt(context.grid, position);

    if (pontoon) {
      if (multiSelect) {
        // Toggle selection
        if (this.state.selectedPontoonIds.has(pontoon.id)) {
          this.state.selectedPontoonIds.delete(pontoon.id);
        } else {
          this.state.selectedPontoonIds.add(pontoon.id);
        }
      } else {
        // Single selection
        this.state.selectedPontoonIds.clear();
        this.state.selectedPontoonIds.add(pontoon.id);
      }
      
      this.callbacks.onSelectionUpdate(new Set(this.state.selectedPontoonIds));
    }
  }

  /**
   * Create UserInput from mouse event
   */
  private createUserInput(
    type: 'mouse_move' | 'mouse_click' | 'mouse_down' | 'mouse_up',
    event: MouseEvent
  ): UserInput {
    const rect = this.canvasRef!.getBoundingClientRect();
    
    return {
      type,
      screenX: event.clientX - rect.left,
      screenY: event.clientY - rect.top,
      button: event.button,
      modifiers: {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey
      },
      timestamp: Date.now()
    };
  }

  /**
   * Get current processing context
   * This would be provided by the React component state
   */
  private getCurrentContext(): ProcessingContext {
    // This is a placeholder - in real implementation, this would come from React state
    // via props or context
    return {
      grid: new (require('../domain')).Grid.createEmpty(50, 50, 3),
      camera: new THREE.PerspectiveCamera(),
      viewport: { 
        width: this.canvasRef?.width || 800, 
        height: this.canvasRef?.height || 600 
      },
      currentLevel: 0,
      currentTool: 'place',
      currentPontoonType: PontoonType.SINGLE,
      currentPontoonColor: PontoonColor.BLUE,
      selectedPontoonIds: new Set(this.state.selectedPontoonIds)
    };
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.canvasRef) return;

    // Mouse events
    this.canvasRef.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvasRef.addEventListener('click', this.handleMouseClick.bind(this));
    this.canvasRef.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvasRef.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Keyboard events (on document for global access)
    document.addEventListener('keydown', this.handleKeyPress.bind(this));
    
    // Prevent context menu
    this.canvasRef.addEventListener('contextmenu', (e) => e.preventDefault());
    
    console.log('🎮 InteractionController: Event listeners attached');
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    if (!this.canvasRef) return;

    this.canvasRef.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvasRef.removeEventListener('click', this.handleMouseClick.bind(this));
    this.canvasRef.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvasRef.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    
    document.removeEventListener('keydown', this.handleKeyPress.bind(this));
    
    console.log('🧹 InteractionController: Event listeners removed');
  }

  /**
   * Update processing statistics
   */
  private updateStats(result: ProcessingResult): void {
    this.stats.totalInteractions++;
    
    if (result.success) {
      this.stats.successfulInteractions++;
    }
    
    const responseTime = result.debugInfo.processingTimeMs;
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.totalInteractions - 1) + responseTime) 
      / this.stats.totalInteractions;
  }

  /**
   * Get interaction statistics
   */
  getStats(): {
    totalInteractions: number;
    successfulInteractions: number;
    successRate: number;
    averageResponseTime: number;
    currentState: InteractionState;
    pipelineStats: any;
  } {
    return {
      ...this.stats,
      successRate: this.stats.totalInteractions > 0 
        ? this.stats.successfulInteractions / this.stats.totalInteractions 
        : 0,
      currentState: { ...this.state },
      pipelineStats: this.pipeline.getStats()
    };
  }

  /**
   * Get history service for external access
   */
  getHistoryService() {
    return this.pipeline.getHistoryService();
  }

  /**
   * Get preview service for external access
   */
  getPreviewService() {
    return this.pipeline.getPreviewService();
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.pipeline.clearCaches();
  }

  /**
   * Force update context (for React integration)
   */
  updateContext(context: Partial<ProcessingContext>): void {
    // This would be used to update the context from React state
    // Implementation depends on how we integrate with React components
    console.log('🔄 InteractionController: Context updated', context);
  }
}