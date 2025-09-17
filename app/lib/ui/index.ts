/**
 * UI Layer - Index
 * 
 * Clean exports for all UI components and systems
 * Provides the interface between React components and the application layer
 */

// Core UI Systems
export { InteractionController } from './InteractionController';
export { RenderingEngine } from './RenderingEngine';
export { ToolSystem } from './ToolSystem';
export { ModelLoader, modelLoader } from './ModelLoader';
export type { ModelInfo } from './ModelLoader';

// Tool Classes
export {
  BaseTool,
  PlaceTool,
  SelectTool,
  DeleteTool,
  RotateTool,
  MultiDropTool,
  MoveTool,
  PaintTool
} from './ToolSystem';

// Types and Interfaces
export type {
  InteractionState,
  InteractionCallbacks
} from './InteractionController';

export type {
  RenderingOptions,
  PreviewData,
  SelectionData,
  SupportData,
  PlacementDebugData
} from './RenderingEngine';

export type {
  ToolContext,
  ToolResult,
  ToolState
} from './ToolSystem';

export { ToolType } from './ToolSystem';

// Re-export common UI constants
export const UI_CONSTANTS = {
  DEFAULT_GRID_OPACITY: 0.3,
  DEFAULT_PREVIEW_OPACITY: 0.6,
  DEFAULT_SELECTION_COLOR: '#ffff00',
  DEFAULT_SUPPORT_COLOR: '#00ff00',
  INTERACTION_DEBOUNCE_MS: 16, // ~60fps
  RENDER_TARGET_FPS: 60
} as const;
