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
  abstract onDragStart?(position: GridPosition, context: ToolContext): void;
  abstract onDragMove?(position: GridPosition, context: ToolContext): void;
  abstract onDragEnd?(position: GridPosition, context: ToolContext): Promise<ToolResult>;

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
 * Select Tool - Pontoon selection
 */
export class SelectTool extends BaseTool {
  readonly type = ToolType.SELECT;
  readonly name = 'Select';
  readonly description = 'Select pontoons for operations';
  readonly cursor = 'pointer';

  async onClick(position: GridPosition, context: ToolContext): Promise<ToolResult> {
    const pontoon = this.configurator.getPontoonAt(context.grid, position);
    
    if (!pontoon) {
      // Click on empty space - clear selection
      return this.createSuccessResult(
        undefined,
        new Set(),
        'Selection cleared'
      );
    }

    // Toggle selection
    const newSelection = new Set(context.selectedPontoonIds);
    if (newSelection.has(pontoon.id)) {
      newSelection.delete(pontoon.id);
    } else {
      newSelection.add(pontoon.id);
    }

    return this.createSuccessResult(
      undefined,
      newSelection,
      `Pontoon ${newSelection.has(pontoon.id) ? 'selected' : 'deselected'}`
    );
  }

  onHover(position: GridPosition, context: ToolContext): void {
    // Show hover feedback for selectable pontoons
    const pontoon = this.configurator.getPontoonAt(context.grid, position);
    if (pontoon) {
      // Could show hover highlight
    }
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