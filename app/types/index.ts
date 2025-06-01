/**
 * Core Type Definitions for Mathematical Precision Pontoon Configurator
 * 
 * All coordinates are in millimeters for maximum precision
 * Grid cells are exactly 400mm x 400mm (0.4m x 0.4m)
 */

export interface GridPosition {
  x: number;
  y: number;
  z: number;
}

export interface PontoonElement {
  id: string;
  gridPosition: GridPosition;
  rotation: number; // 0, 90, 180, 270 degrees
  type: 'single' | 'double';
  color: 'black' | 'blue' | 'gray' | 'yellow';
  metadata?: Record<string, unknown>;
}

export interface GridCell {
  occupied: boolean;
  elementId?: string;
  isValid: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface BoundingBox {
  min: GridPosition;
  max: GridPosition;
}

export interface SpatialElement {
  id: string;
  position: GridPosition;
  bounds: GridPosition;
}

// Tool Types
export type Tool = 'select' | 'place' | 'delete' | 'rotate' | 'multi-drop';
export type ViewMode = '2d' | '3d';
export type PontoonType = PontoonElement['type'];
export type PontoonColor = PontoonElement['color'];

// History Types
export interface HistoryAction {
  action: 'add' | 'remove' | 'move' | 'rotate';
  pontoon: PontoonElement;
  timestamp: number;
}

// Store State Interfaces
export interface GridState {
  gridSize: { width: number; height: number };
  cellSize: number;
  pontoons: Map<string, PontoonElement>;
  selectedIds: Set<string>;
  hoveredCell: GridPosition | null;
}

export interface UIState {
  viewMode: ViewMode;
  selectedTool: Tool;
  currentPontoonType: PontoonType;
  isGridVisible: boolean;
  showCoordinates: boolean;
}

export interface HistoryState {
  history: HistoryAction[];
  historyIndex: number;
  maxHistorySize: number;
}