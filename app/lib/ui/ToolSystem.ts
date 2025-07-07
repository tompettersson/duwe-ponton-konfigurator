/**
 * ToolSystem - All Interaction Modes with New Architecture
 * 
 * Centralized tool management using the domain and application layers
 * Replaces scattered tool logic with clean, testable system
 */

import { 
  Grid,
  GridPosition,
  PontoonType,
  PontoonColor,
  PontoonId
} from '../domain';
import { 
  ConfiguratorService,
  PreviewService,
  HistoryService,
  OperationResult,
  BatchOperationResult
} from '../application';

export enum ToolType {
  PLACE = 'place',
  SELECT = 'select',
  DELETE = 'delete',
  ROTATE = 'rotate',
  MULTI_DROP = 'multi-drop',
  MOVE = 'move',
  COPY = 'copy',
  PAINT = 'paint'
}

export interface ToolContext {
  grid: Grid;
  currentLevel: number;
  currentPontoonType: PontoonType;
  currentPontoonColor: PontoonColor;
  selectedPontoonIds: Set<PontoonId>;
}

export interface ToolResult {
  success: boolean;
  newGrid?: Grid;
  newSelection?: Set<PontoonId>;
  message?: string;
  errors?: string[];
  operations?: any[];
}

export interface ToolState {
  isActive: boolean;
  isDragging: boolean;
  dragStart?: GridPosition;
  dragEnd?: GridPosition;
  clipboard?: PontoonId[];
  paintColor?: PontoonColor;
}

export abstract class BaseTool {
  protected configurator: ConfiguratorService;
  protected preview: PreviewService;
  protected history: HistoryService;
  protected state: ToolState;

  constructor() {
    this.configurator = new ConfiguratorService();
    this.preview = new PreviewService();
    this.history = new HistoryService();
    this.state = {
      isActive: false,
      isDragging: false
    };
  }

  abstract readonly type: ToolType;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly cursor: string;

  // Tool lifecycle methods
  activate(): void {
    this.state.isActive = true;
    console.log(`🔧 Tool: ${this.name} activated`);
  }

  deactivate(): void {
    this.state.isActive = false;
    this.state.isDragging = false;
    this.preview.clearPreview();
    console.log(`🔧 Tool: ${this.name} deactivated`);
  }

  // Interaction methods (to be implemented by tools)
  abstract onClick(position: GridPosition, context: ToolContext): Promise<ToolResult>;
  abstract onHover(position: GridPosition, context: ToolContext): void;
  
  // Optional drag methods (only needed for tools that support dragging)
  onDragStart?(position: GridPosition, context: ToolContext): void;
  onDragMove?(position: GridPosition, context: ToolContext): void;
  onDragEnd?(position: GridPosition, context: ToolContext): Promise<ToolResult>;

  // Utility methods
  protected createSuccessResult(
    newGrid?: Grid, 
    newSelection?: Set<PontoonId>, 
    message?: string
  ): ToolResult {
    return {
      success: true,
      newGrid,
      newSelection,
      message
    };
  }

  protected createErrorResult(errors: string[]): ToolResult {
    return {
      success: false,
      errors
    };
  }
}

/**
 * Place Tool - Pontoon placement
 */
export class PlaceTool extends BaseTool {
  readonly type = ToolType.PLACE;
  readonly name = 'Place';
  readonly description = 'Place pontoons on the grid';
  readonly cursor = 'crosshair';

  async onClick(position: GridPosition, context: ToolContext): Promise<ToolResult> {
    const result = this.configurator.placePontoon(
      context.grid,
      position,
      context.currentPontoonType,
      context.currentPontoonColor
    );

    if (result.success && result.grid) {
      return this.createSuccessResult(
        result.grid,
        undefined,
        `${context.currentPontoonType} pontoon placed`
      );
    } else {
      return this.createErrorResult(result.errors || ['Placement failed']);
    }
  }

  onHover(position: GridPosition, context: ToolContext): void {
    this.preview.updatePreview(
      context.grid,
      position,
      context.currentPontoonType,
      context.currentPontoonColor
    );
  }
}

/**
 * Select Tool - Enhanced pontoon selection with drag support
 */
export class SelectTool extends BaseTool {
  readonly type = ToolType.SELECT;
  readonly name = 'Select';
  readonly description = 'Select pontoons (click, ctrl+click, drag)';
  readonly cursor = 'pointer';

  private dragThreshold = 5; // pixels
  private dragStartScreen?: { x: number; y: number };
  private selectionPreview: Set<PontoonId> = new Set();

  async onClick(position: GridPosition, context: ToolContext): Promise<ToolResult> {
    // If we were dragging, this click is handled by onDragEnd
    if (this.state.isDragging) {
      return { success: true };
    }

    const pontoon = this.configurator.getPontoonAt(context.grid, position);
    
    if (!pontoon) {
      // Click on empty space - clear selection unless Ctrl is held
      return this.createSuccessResult(
        undefined,
        new Set(),
        'Selection cleared'
      );
    }

    // Handle selection based on modifiers
    const newSelection = new Set(context.selectedPontoonIds);
    
    // Always toggle selection for individual clicks
    if (newSelection.has(pontoon.id)) {
      newSelection.delete(pontoon.id);
    } else {
      newSelection.add(pontoon.id);
    }

    const message = newSelection.has(pontoon.id) ? 
      `Selected: ${newSelection.size} pontoon(s)` : 
      `Deselected: ${newSelection.size} pontoon(s)`;

    return this.createSuccessResult(
      undefined,
      newSelection,
      message
    );
  }

  onHover(position: GridPosition, context: ToolContext): void {
    if (this.state.isDragging && this.state.dragStart) {
      // Update drag selection preview
      this.updateDragSelectionPreview(position, context);
    } else {
      // Show hover feedback for selectable pontoons
      const pontoon = this.configurator.getPontoonAt(context.grid, position);
      if (pontoon) {
        // Could show hover highlight
      }
    }
  }

  onDragStart(position: GridPosition, context: ToolContext): void {
    this.state.isDragging = true;
    this.state.dragStart = position;
    this.state.dragEnd = position;
    this.selectionPreview = new Set();
    console.log('🎯 SelectTool: Drag selection started at', position.toString());
  }

  onDragMove(position: GridPosition, context: ToolContext): void {
    if (this.state.isDragging) {
      this.state.dragEnd = position;
      this.updateDragSelectionPreview(position, context);
    }
  }

  async onDragEnd(position: GridPosition, context: ToolContext): Promise<ToolResult> {
    if (!this.state.isDragging || !this.state.dragStart) {
      return this.createErrorResult(['No drag operation in progress']);
    }

    // Calculate final selection area
    const selectedPontoons = this.calculateDragSelection(position, context);
    
    // Determine how to merge with existing selection
    let newSelection = new Set(context.selectedPontoonIds);
    
    // Always add to selection on drag (standard UX pattern)
    for (const pontoonId of selectedPontoons) {
      newSelection.add(pontoonId);
    }

    // Reset drag state
    this.state.isDragging = false;
    this.state.dragStart = undefined;
    this.state.dragEnd = undefined;
    this.selectionPreview.clear();

    const message = selectedPontoons.size > 0 ? 
      `Selected ${selectedPontoons.size} pontoon(s) (Total: ${newSelection.size})` :
      'No pontoons in selection area';

    return this.createSuccessResult(
      undefined,
      newSelection,
      message
    );
  }

  deactivate(): void {
    super.deactivate();
    this.selectionPreview.clear();
    this.dragStartScreen = undefined;
  }

  /**
   * Update drag selection preview
   */
  private updateDragSelectionPreview(endPosition: GridPosition, context: ToolContext): void {
    const selectedPontoons = this.calculateDragSelection(endPosition, context);
    this.selectionPreview = selectedPontoons;
    
    // Could trigger preview update callback here
    console.log(`🎯 SelectTool: Preview selection: ${selectedPontoons.size} pontoons`);
  }

  /**
   * Calculate which pontoons are selected by drag area
   */
  private calculateDragSelection(endPosition: GridPosition, context: ToolContext): Set<PontoonId> {
    if (!this.state.dragStart) return new Set();

    // Get rectangular area between drag start and end
    const positions = GridPosition.getRectangularArea(this.state.dragStart, endPosition);
    
    // Filter to current level only
    const levelPositions = positions.filter(pos => pos.y === context.currentLevel);
    
    // Find all pontoons that intersect with the selection area
    const selectedPontoons = new Set<PontoonId>();
    
    for (const pontoon of context.grid.pontoons.values()) {
      // Skip pontoons on different levels
      if (pontoon.position.y !== context.currentLevel) continue;
      
      // Check if pontoon's occupied positions intersect with selection area
      const occupiedPositions = pontoon.getOccupiedPositions();
      const intersects = occupiedPositions.some(occupiedPos =>
        levelPositions.some(selectionPos => selectionPos.equals(occupiedPos))
      );
      
      if (intersects) {
        selectedPontoons.add(pontoon.id);
      }
    }
    
    return selectedPontoons;
  }

  /**
   * Get current selection preview (for visual feedback)
   */
  getSelectionPreview(): Set<PontoonId> {
    return new Set(this.selectionPreview);
  }

  /**
   * Check if tool is currently showing drag selection
   */
  isDragSelecting(): boolean {
    return this.state.isDragging;
  }

  /**
   * Get current drag area (for visual selection box)
   */
  getDragArea(): { start: GridPosition; end: GridPosition } | null {
    if (!this.state.isDragging || !this.state.dragStart || !this.state.dragEnd) {
      return null;
    }
    return {
      start: this.state.dragStart,
      end: this.state.dragEnd
    };
  }
}

/**
 * Delete Tool - Pontoon deletion
 */
export class DeleteTool extends BaseTool {
  readonly type = ToolType.DELETE;
  readonly name = 'Delete';
  readonly description = 'Delete pontoons from the grid';
  readonly cursor = 'crosshair';

  async onClick(position: GridPosition, context: ToolContext): Promise<ToolResult> {
    const pontoon = this.configurator.getPontoonAt(context.grid, position);
    
    if (!pontoon) {
      return this.createErrorResult(['No pontoon to delete at this position']);
    }

    const result = this.configurator.removePontoon(context.grid, pontoon.id);

    if (result.success && result.grid) {
      // Remove from selection if selected
      const newSelection = new Set(context.selectedPontoonIds);
      newSelection.delete(pontoon.id);

      return this.createSuccessResult(
        result.grid,
        newSelection,
        'Pontoon deleted'
      );
    } else {
      return this.createErrorResult(result.errors || ['Deletion failed']);
    }
  }

  onHover(position: GridPosition, context: ToolContext): void {
    // Show deletion preview
    const pontoon = this.configurator.getPontoonAt(context.grid, position);
    if (pontoon) {
      // Could show deletion highlight
    }
  }
}

/**
 * Rotate Tool - Pontoon rotation
 */
export class RotateTool extends BaseTool {
  readonly type = ToolType.ROTATE;
  readonly name = 'Rotate';
  readonly description = 'Rotate pontoons';
  readonly cursor = 'grab';

  async onClick(position: GridPosition, context: ToolContext): Promise<ToolResult> {
    const pontoon = this.configurator.getPontoonAt(context.grid, position);
    
    if (!pontoon) {
      return this.createErrorResult(['No pontoon to rotate at this position']);
    }

    try {
      const newGrid = context.grid.rotatePontoon(pontoon.id, (pontoon.rotation + 90) % 360);
      
      return this.createSuccessResult(
        newGrid,
        undefined,
        'Pontoon rotated'
      );
    } catch (error) {
      return this.createErrorResult([error instanceof Error ? error.message : 'Rotation failed']);
    }
  }

  onHover(position: GridPosition, context: ToolContext): void {
    // Show rotation preview
    const pontoon = this.configurator.getPontoonAt(context.grid, position);
    if (pontoon) {
      // Could show rotation indicator
    }
  }
}

/**
 * MultiDrop Tool - Batch placement
 */
export class MultiDropTool extends BaseTool {
  readonly type = ToolType.MULTI_DROP;
  readonly name = 'Multi-Drop';
  readonly description = 'Place multiple pontoons by dragging';
  readonly cursor = 'crosshair';

  async onClick(position: GridPosition, context: ToolContext): Promise<ToolResult> {
    // Single click places one pontoon
    const result = this.configurator.placePontoon(
      context.grid,
      position,
      context.currentPontoonType,
      context.currentPontoonColor
    );

    if (result.success && result.grid) {
      return this.createSuccessResult(
        result.grid,
        undefined,
        `${context.currentPontoonType} pontoon placed`
      );
    } else {
      return this.createErrorResult(result.errors || ['Placement failed']);
    }
  }

  onHover(position: GridPosition, context: ToolContext): void {
    if (this.state.isDragging && this.state.dragStart) {
      // Update multi-preview
      const positions = GridPosition.getRectangularArea(this.state.dragStart, position);
      const levelPositions = positions.filter(pos => pos.y === context.currentLevel);
      
      // Filter for double pontoons
      let filteredPositions = levelPositions;
      if (context.currentPontoonType === PontoonType.DOUBLE) {
        const minX = Math.min(this.state.dragStart.x, position.x);
        filteredPositions = levelPositions.filter(pos => {
          const relativeX = pos.x - minX;
          return relativeX % 2 === 0;
        });
      }

      this.preview.updateMultiPreview(
        context.grid,
        filteredPositions,
        context.currentPontoonType,
        context.currentPontoonColor
      );
    } else {
      // Single preview
      this.preview.updatePreview(
        context.grid,
        position,
        context.currentPontoonType,
        context.currentPontoonColor
      );
    }
  }

  onDragStart(position: GridPosition, context: ToolContext): void {
    this.state.isDragging = true;
    this.state.dragStart = position;
    this.state.dragEnd = position;
    console.log('🎯 MultiDrop: Drag started at', position.toString());
  }

  onDragMove(position: GridPosition, context: ToolContext): void {
    if (this.state.isDragging) {
      this.state.dragEnd = position;
      this.onHover(position, context); // Update preview
    }
  }

  async onDragEnd(position: GridPosition, context: ToolContext): Promise<ToolResult> {
    if (!this.state.isDragging || !this.state.dragStart) {
      return this.createErrorResult(['No drag operation in progress']);
    }

    const positions = GridPosition.getRectangularArea(this.state.dragStart, position);
    const levelPositions = positions.filter(pos => pos.y === context.currentLevel);
    
    // Filter for double pontoons
    let filteredPositions = levelPositions;
    if (context.currentPontoonType === PontoonType.DOUBLE) {
      const minX = Math.min(this.state.dragStart.x, position.x);
      filteredPositions = levelPositions.filter(pos => {
        const relativeX = pos.x - minX;
        return relativeX % 2 === 0;
      });
    }

    // Execute batch placement
    const result = await this.configurator.placePontoonsBatch(context.grid, {
      positions: filteredPositions,
      type: context.currentPontoonType,
      color: context.currentPontoonColor,
      skipInvalid: true
    });

    // Reset drag state
    this.state.isDragging = false;
    this.state.dragStart = undefined;
    this.state.dragEnd = undefined;
    this.preview.clearMultiPreview();

    if (result.success && result.grid) {
      return this.createSuccessResult(
        result.grid,
        undefined,
        `Multi-drop: ${result.successCount} pontoons placed`
      );
    } else {
      return this.createErrorResult(result.errors);
    }
  }
}

/**
 * Move Tool - Pontoon movement
 */
export class MoveTool extends BaseTool {
  readonly type = ToolType.MOVE;
  readonly name = 'Move';
  readonly description = 'Move pontoons to new positions';
  readonly cursor = 'move';

  private movingPontoonId?: PontoonId;

  async onClick(position: GridPosition, context: ToolContext): Promise<ToolResult> {
    if (!this.movingPontoonId) {
      // First click - select pontoon to move
      const pontoon = this.configurator.getPontoonAt(context.grid, position);
      if (!pontoon) {
        return this.createErrorResult(['No pontoon to move at this position']);
      }
      
      this.movingPontoonId = pontoon.id;
      return this.createSuccessResult(
        undefined,
        new Set([pontoon.id]),
        'Pontoon selected for moving. Click destination.'
      );
    } else {
      // Second click - move to destination
      const result = this.configurator.movePontoon(
        context.grid,
        this.movingPontoonId,
        position
      );

      this.movingPontoonId = undefined;

      if (result.success && result.grid) {
        return this.createSuccessResult(
          result.grid,
          new Set(),
          'Pontoon moved'
        );
      } else {
        return this.createErrorResult(result.errors || ['Move failed']);
      }
    }
  }

  onHover(position: GridPosition, context: ToolContext): void {
    if (this.movingPontoonId) {
      // Show move preview
      // Could validate if move is possible
    }
  }

  deactivate(): void {
    super.deactivate();
    this.movingPontoonId = undefined;
  }
}

/**
 * Paint Tool - Color changing
 */
export class PaintTool extends BaseTool {
  readonly type = ToolType.PAINT;
  readonly name = 'Paint';
  readonly description = 'Change pontoon colors';
  readonly cursor = 'crosshair';

  async onClick(position: GridPosition, context: ToolContext): Promise<ToolResult> {
    const pontoon = this.configurator.getPontoonAt(context.grid, position);
    
    if (!pontoon) {
      return this.createErrorResult(['No pontoon to paint at this position']);
    }

    if (pontoon.color === context.currentPontoonColor) {
      return this.createErrorResult(['Pontoon already has this color']);
    }

    try {
      const newGrid = context.grid.updatePontoonColor(pontoon.id, context.currentPontoonColor);
      
      return this.createSuccessResult(
        newGrid,
        undefined,
        'Pontoon color changed'
      );
    } catch (error) {
      return this.createErrorResult([error instanceof Error ? error.message : 'Paint failed']);
    }
  }

  onHover(position: GridPosition, context: ToolContext): void {
    // Show paint preview
    const pontoon = this.configurator.getPontoonAt(context.grid, position);
    if (pontoon && pontoon.color !== context.currentPontoonColor) {
      // Could show color preview
    }
  }
}

/**
 * ToolSystem - Manages all tools
 */
export class ToolSystem {
  private tools: Map<ToolType, BaseTool>;
  private activeTool: BaseTool | null = null;

  constructor() {
    this.tools = new Map();
    this.initializeTools();
  }

  private initializeTools(): void {
    const tools = [
      new PlaceTool(),
      new SelectTool(),
      new DeleteTool(),
      new RotateTool(),
      new MultiDropTool(),
      new MoveTool(),
      new PaintTool()
    ];

    for (const tool of tools) {
      this.tools.set(tool.type, tool);
    }

    console.log('🔧 ToolSystem: Initialized with', tools.length, 'tools');
  }

  /**
   * Activate tool by type
   */
  activateTool(toolType: ToolType): boolean {
    const tool = this.tools.get(toolType);
    if (!tool) {
      console.warn('🔧 ToolSystem: Tool not found:', toolType);
      return false;
    }

    // Deactivate current tool
    if (this.activeTool) {
      this.activeTool.deactivate();
    }

    // Activate new tool
    this.activeTool = tool;
    this.activeTool.activate();

    return true;
  }

  /**
   * Get active tool
   */
  getActiveTool(): BaseTool | null {
    return this.activeTool;
  }

  /**
   * Get all available tools
   */
  getAllTools(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool by type
   */
  getTool(toolType: ToolType): BaseTool | null {
    return this.tools.get(toolType) || null;
  }

  /**
   * Handle click event
   */
  async handleClick(position: GridPosition, context: ToolContext): Promise<ToolResult> {
    if (!this.activeTool) {
      return {
        success: false,
        errors: ['No tool active']
      };
    }

    return await this.activeTool.onClick(position, context);
  }

  /**
   * Handle hover event
   */
  handleHover(position: GridPosition, context: ToolContext): void {
    if (this.activeTool) {
      this.activeTool.onHover(position, context);
    }
  }

  /**
   * Handle drag start
   */
  handleDragStart(position: GridPosition, context: ToolContext): void {
    if (this.activeTool && this.activeTool.onDragStart) {
      this.activeTool.onDragStart(position, context);
    }
  }

  /**
   * Handle drag move
   */
  handleDragMove(position: GridPosition, context: ToolContext): void {
    if (this.activeTool && this.activeTool.onDragMove) {
      this.activeTool.onDragMove(position, context);
    }
  }

  /**
   * Handle drag end
   */
  async handleDragEnd(position: GridPosition, context: ToolContext): Promise<ToolResult> {
    if (this.activeTool && this.activeTool.onDragEnd) {
      return await this.activeTool.onDragEnd(position, context);
    }

    return { success: true };
  }

  /**
   * Get current cursor for active tool
   */
  getCurrentCursor(): string {
    return this.activeTool?.cursor || 'default';
  }

  /**
   * Cleanup all tools
   */
  cleanup(): void {
    if (this.activeTool) {
      this.activeTool.deactivate();
      this.activeTool = null;
    }

    console.log('🧹 ToolSystem: Cleaned up');
  }
}