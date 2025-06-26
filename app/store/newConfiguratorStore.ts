/**
 * New Configurator Store - Immutable State Management
 * 
 * Zustand store implementing immutable state patterns
 * Uses the new domain layer for all business logic
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { 
  Grid,
  GridPosition,
  Pontoon,
  PontoonType,
  PontoonColor,
  PontoonId,
  ValidationResult,
  DOMAIN_CONSTANTS
} from '../lib/domain';

// UI-specific state that doesn't belong in domain
export interface UIState {
  viewMode: '2d' | '3d';
  isGridVisible: boolean;
  selectedTool: 'place' | 'select' | 'delete' | 'rotate' | 'multi-drop';
  currentLevel: number;
  currentPontoonType: PontoonType;
  currentPontoonColor: PontoonColor;
  hoveredCell: GridPosition | null;
  selectedIds: Set<PontoonId>;
  isDragging: boolean;
  dragStart: GridPosition | null;
  dragEnd: GridPosition | null;
  previewPositions: Set<string>;
}

// History state for undo/redo
export interface HistoryState {
  past: Grid[];
  present: Grid;
  future: Grid[];
  maxHistorySize: number;
}

// Complete configurator state
export interface ConfiguratorState {
  // Core domain state
  grid: Grid;
  
  // UI state
  ui: UIState;
  
  // History state
  history: HistoryState;
  
  // Actions
  actions: {
    // Grid operations
    placePontoon: (position: GridPosition) => void;
    removePontoon: (pontoonId: PontoonId) => void;
    movePontoon: (pontoonId: PontoonId, newPosition: GridPosition) => void;
    updatePontoonColor: (pontoonId: PontoonId, color: PontoonColor) => void;
    rotatePontoon: (pontoonId: PontoonId) => void;
    
    // Validation queries
    canPlacePontoon: (position: GridPosition, type?: PontoonType) => boolean;
    hasPontoonAt: (position: GridPosition) => boolean;
    getPontoonAt: (position: GridPosition) => Pontoon | null;
    hasSupport: (position: GridPosition) => boolean;
    validatePlacement: (position: GridPosition, type?: PontoonType) => ValidationResult;
    
    // Selection operations
    selectPontoon: (pontoonId: PontoonId) => void;
    deselectPontoon: (pontoonId: PontoonId) => void;
    selectMultiple: (pontoonIds: PontoonId[]) => void;
    clearSelection: () => void;
    deleteSelected: () => void;
    
    // UI operations
    setHoveredCell: (position: GridPosition | null) => void;
    setCurrentLevel: (level: number) => void;
    setCurrentTool: (tool: UIState['selectedTool']) => void;
    setCurrentPontoonType: (type: PontoonType) => void;
    setCurrentPontoonColor: (color: PontoonColor) => void;
    setViewMode: (mode: '2d' | '3d') => void;
    toggleGridVisibility: () => void;
    
    // Multi-drop operations
    startDrag: (position: GridPosition) => void;
    updateDrag: (position: GridPosition) => void;
    endDrag: () => void;
    executeMultiDrop: () => void;
    
    // History operations
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
    
    // Grid operations
    clearGrid: () => void;
    resizeGrid: (width: number, height: number, levels?: number) => void;
    
    // Import/Export
    exportGrid: () => string;
    importGrid: (data: string) => void;
  };
}

// Create the store
export const useNewConfiguratorStore = create<ConfiguratorState>()(
  immer((set, get) => {
    // Initialize default grid
    const defaultGrid = Grid.createEmpty(
      DOMAIN_CONSTANTS.DEFAULT_GRID_SIZE,
      DOMAIN_CONSTANTS.DEFAULT_GRID_SIZE,
      DOMAIN_CONSTANTS.DEFAULT_LEVELS
    );

    // Initial state
    const initialState: Omit<ConfiguratorState, 'actions'> = {
      grid: defaultGrid,
      ui: {
        viewMode: '3d',
        isGridVisible: true,
        selectedTool: 'place',
        currentLevel: 0,
        currentPontoonType: PontoonType.SINGLE,
        currentPontoonColor: PontoonColor.BLUE,
        hoveredCell: null,
        selectedIds: new Set(),
        isDragging: false,
        dragStart: null,
        dragEnd: null,
        previewPositions: new Set()
      },
      history: {
        past: [],
        present: defaultGrid,
        future: [],
        maxHistorySize: 50
      }
    };

    return {
      ...initialState,
      actions: {
        // Grid operations
        placePontoon: (position: GridPosition) => {
          set((state) => {
            const { currentPontoonType, currentPontoonColor } = state.ui;
            
            try {
              const newGrid = state.grid.placePontoon(
                position,
                currentPontoonType,
                currentPontoonColor
              );
              
              // Update grid
              state.grid = newGrid;
              
              // Add to history
              state.history.past.push(state.history.present);
              state.history.present = newGrid;
              state.history.future = [];
              
              // Limit history size
              if (state.history.past.length > state.history.maxHistorySize) {
                state.history.past.shift();
              }
              
              console.log('✅ Pontoon placed successfully at', position.toString());
            } catch (error) {
              console.warn('❌ Failed to place pontoon:', error);
            }
          });
        },
        
        removePontoon: (pontoonId: PontoonId) => {
          set((state) => {
            try {
              const newGrid = state.grid.removePontoon(pontoonId);
              
              // Update grid
              state.grid = newGrid;
              
              // Remove from selection
              state.ui.selectedIds.delete(pontoonId);
              
              // Add to history
              state.history.past.push(state.history.present);
              state.history.present = newGrid;
              state.history.future = [];
              
              console.log('✅ Pontoon removed successfully:', pontoonId);
            } catch (error) {
              console.warn('❌ Failed to remove pontoon:', error);
            }
          });
        },
        
        movePontoon: (pontoonId: PontoonId, newPosition: GridPosition) => {
          set((state) => {
            try {
              const newGrid = state.grid.movePontoon(pontoonId, newPosition);
              
              // Update grid
              state.grid = newGrid;
              
              // Add to history
              state.history.past.push(state.history.present);
              state.history.present = newGrid;
              state.history.future = [];
              
              console.log('✅ Pontoon moved successfully:', pontoonId, 'to', newPosition.toString());
            } catch (error) {
              console.warn('❌ Failed to move pontoon:', error);
            }
          });
        },
        
        updatePontoonColor: (pontoonId: PontoonId, color: PontoonColor) => {
          set((state) => {
            try {
              const newGrid = state.grid.updatePontoonColor(pontoonId, color);
              
              // Update grid
              state.grid = newGrid;
              
              // Add to history
              state.history.past.push(state.history.present);
              state.history.present = newGrid;
              state.history.future = [];
              
              console.log('✅ Pontoon color updated successfully:', pontoonId, 'to', color);
            } catch (error) {
              console.warn('❌ Failed to update pontoon color:', error);
            }
          });
        },
        
        rotatePontoon: (pontoonId: PontoonId) => {
          set((state) => {
            try {
              const pontoon = state.grid.pontoons.get(pontoonId);
              if (!pontoon) return;
              
              // Cycle through rotations: 0 -> 90 -> 180 -> 270 -> 0
              const newRotation = (pontoon.rotation + 90) % 360;
              
              const newGrid = state.grid.rotatePontoon(pontoonId, newRotation);
              
              // Update grid
              state.grid = newGrid;
              
              // Add to history
              state.history.past.push(state.history.present);
              state.history.present = newGrid;
              state.history.future = [];
              
              console.log('✅ Pontoon rotated successfully:', pontoonId, 'to', newRotation);
            } catch (error) {
              console.warn('❌ Failed to rotate pontoon:', error);
            }
          });
        },
        
        // Validation queries
        canPlacePontoon: (position: GridPosition, type?: PontoonType) => {
          const state = get();
          const pontoonType = type || state.ui.currentPontoonType;
          return state.grid.canPlacePontoon(position, pontoonType);
        },
        
        hasPontoonAt: (position: GridPosition) => {
          const state = get();
          return state.grid.hasPontoonAt(position);
        },
        
        getPontoonAt: (position: GridPosition) => {
          const state = get();
          return state.grid.getPontoonAt(position);
        },
        
        hasSupport: (position: GridPosition) => {
          const state = get();
          return state.grid.hasSupport(position);
        },
        
        validatePlacement: (position: GridPosition, type?: PontoonType) => {
          const state = get();
          const pontoonType = type || state.ui.currentPontoonType;
          // For now, return simple validation result
          const canPlace = state.grid.canPlacePontoon(position, pontoonType);
          return {
            valid: canPlace,
            errors: canPlace ? [] : [{ type: 'UNKNOWN' as any, message: 'Cannot place pontoon' }]
          };
        },
        
        // Selection operations
        selectPontoon: (pontoonId: PontoonId) => {
          set((state) => {
            state.ui.selectedIds.add(pontoonId);
          });
        },
        
        deselectPontoon: (pontoonId: PontoonId) => {
          set((state) => {
            state.ui.selectedIds.delete(pontoonId);
          });
        },
        
        selectMultiple: (pontoonIds: PontoonId[]) => {
          set((state) => {
            pontoonIds.forEach(id => state.ui.selectedIds.add(id));
          });
        },
        
        clearSelection: () => {
          set((state) => {
            state.ui.selectedIds.clear();
          });
        },
        
        deleteSelected: () => {
          set((state) => {
            const selectedIds = Array.from(state.ui.selectedIds);
            let currentGrid = state.grid;
            
            // Remove all selected pontoons
            for (const pontoonId of selectedIds) {
              try {
                currentGrid = currentGrid.removePontoon(pontoonId);
              } catch (error) {
                console.warn('Failed to remove pontoon during multi-delete:', pontoonId, error);
              }
            }
            
            // Update grid
            state.grid = currentGrid;
            
            // Clear selection
            state.ui.selectedIds.clear();
            
            // Add to history
            state.history.past.push(state.history.present);
            state.history.present = currentGrid;
            state.history.future = [];
            
            console.log('✅ Deleted selected pontoons:', selectedIds.length);
          });
        },
        
        // UI operations
        setHoveredCell: (position: GridPosition | null) => {
          set((state) => {
            state.ui.hoveredCell = position;
          });
        },
        
        setCurrentLevel: (level: number) => {
          set((state) => {
            state.ui.currentLevel = Math.max(0, Math.min(level, state.grid.dimensions.levels - 1));
          });
        },
        
        setCurrentTool: (tool: UIState['selectedTool']) => {
          set((state) => {
            state.ui.selectedTool = tool;
            // Clear selection when switching tools
            if (tool !== 'select') {
              state.ui.selectedIds.clear();
            }
          });
        },
        
        setCurrentPontoonType: (type: PontoonType) => {
          set((state) => {
            state.ui.currentPontoonType = type;
          });
        },
        
        setCurrentPontoonColor: (color: PontoonColor) => {
          set((state) => {
            state.ui.currentPontoonColor = color;
          });
        },
        
        setViewMode: (mode: '2d' | '3d') => {
          set((state) => {
            state.ui.viewMode = mode;
          });
        },
        
        toggleGridVisibility: () => {
          set((state) => {
            state.ui.isGridVisible = !state.ui.isGridVisible;
          });
        },
        
        // Multi-drop operations
        startDrag: (position: GridPosition) => {
          set((state) => {
            state.ui.isDragging = true;
            state.ui.dragStart = position;
            state.ui.dragEnd = position;
            state.ui.previewPositions.clear();
          });
        },
        
        updateDrag: (position: GridPosition) => {
          set((state) => {
            if (!state.ui.isDragging || !state.ui.dragStart) return;
            
            state.ui.dragEnd = position;
            
            // Update preview positions
            state.ui.previewPositions.clear();
            const positions = GridPosition.getRectangularArea(state.ui.dragStart, position);
            
            // Filter positions for current level
            const levelPositions = positions.filter(pos => pos.y === state.ui.currentLevel);
            
            // Filter for double pontoons (every other X position)
            let filteredPositions = levelPositions;
            if (state.ui.currentPontoonType === PontoonType.DOUBLE) {
              const minX = Math.min(state.ui.dragStart.x, position.x);
              filteredPositions = levelPositions.filter(pos => {
                const relativeX = pos.x - minX;
                return relativeX % 2 === 0;
              });
            }
            
            // Add valid positions to preview
            filteredPositions.forEach(pos => {
              if (state.grid.canPlacePontoon(pos, state.ui.currentPontoonType)) {
                state.ui.previewPositions.add(pos.toString());
              }
            });
          });
        },
        
        endDrag: () => {
          set((state) => {
            state.ui.isDragging = false;
            state.ui.dragStart = null;
            state.ui.dragEnd = null;
            state.ui.previewPositions.clear();
          });
        },
        
        executeMultiDrop: () => {
          set((state) => {
            if (!state.ui.isDragging || !state.ui.dragStart || !state.ui.dragEnd) return;
            
            const positions = GridPosition.getRectangularArea(state.ui.dragStart, state.ui.dragEnd);
            const levelPositions = positions.filter(pos => pos.y === state.ui.currentLevel);
            
            // Filter for double pontoons
            let filteredPositions = levelPositions;
            if (state.ui.currentPontoonType === PontoonType.DOUBLE) {
              const minX = Math.min(state.ui.dragStart.x, state.ui.dragEnd.x);
              filteredPositions = levelPositions.filter(pos => {
                const relativeX = pos.x - minX;
                return relativeX % 2 === 0;
              });
            }
            
            let currentGrid = state.grid;
            let placedCount = 0;
            
            // Place pontoons at all valid positions
            for (const position of filteredPositions) {
              if (currentGrid.canPlacePontoon(position, state.ui.currentPontoonType)) {
                try {
                  currentGrid = currentGrid.placePontoon(
                    position,
                    state.ui.currentPontoonType,
                    state.ui.currentPontoonColor
                  );
                  placedCount++;
                } catch (error) {
                  console.warn('Failed to place pontoon during multi-drop:', position.toString(), error);
                }
              }
            }
            
            // Update grid
            state.grid = currentGrid;
            
            // Add to history if any pontoons were placed
            if (placedCount > 0) {
              state.history.past.push(state.history.present);
              state.history.present = currentGrid;
              state.history.future = [];
            }
            
            // End drag
            state.ui.isDragging = false;
            state.ui.dragStart = null;
            state.ui.dragEnd = null;
            state.ui.previewPositions.clear();
            
            console.log('✅ Multi-drop completed:', placedCount, 'pontoons placed');
          });
        },
        
        // History operations
        undo: () => {
          set((state) => {
            if (state.history.past.length === 0) return;
            
            const previous = state.history.past.pop()!;
            state.history.future.unshift(state.history.present);
            state.history.present = previous;
            state.grid = previous;
            
            console.log('↶ Undo executed');
          });
        },
        
        redo: () => {
          set((state) => {
            if (state.history.future.length === 0) return;
            
            const next = state.history.future.shift()!;
            state.history.past.push(state.history.present);
            state.history.present = next;
            state.grid = next;
            
            console.log('↷ Redo executed');
          });
        },
        
        canUndo: () => {
          const state = get();
          return state.history.past.length > 0;
        },
        
        canRedo: () => {
          const state = get();
          return state.history.future.length > 0;
        },
        
        // Grid operations
        clearGrid: () => {
          set((state) => {
            const newGrid = Grid.createEmpty(
              state.grid.dimensions.width,
              state.grid.dimensions.height,
              state.grid.dimensions.levels
            );
            
            // Update grid
            state.grid = newGrid;
            
            // Clear selection
            state.ui.selectedIds.clear();
            
            // Add to history
            state.history.past.push(state.history.present);
            state.history.present = newGrid;
            state.history.future = [];
            
            console.log('✅ Grid cleared');
          });
        },
        
        resizeGrid: (width: number, height: number, levels: number = 3) => {
          set((state) => {
            const newGrid = Grid.createEmpty(width, height, levels);
            
            // Update grid
            state.grid = newGrid;
            
            // Clear selection
            state.ui.selectedIds.clear();
            
            // Reset current level if needed
            if (state.ui.currentLevel >= levels) {
              state.ui.currentLevel = 0;
            }
            
            // Add to history
            state.history.past.push(state.history.present);
            state.history.present = newGrid;
            state.history.future = [];
            
            console.log('✅ Grid resized to', width, 'x', height, 'x', levels);
          });
        },
        
        // Import/Export
        exportGrid: () => {
          const state = get();
          return JSON.stringify(state.grid.toJSON(), null, 2);
        },
        
        importGrid: (data: string) => {
          set((state) => {
            try {
              const gridData = JSON.parse(data);
              const newGrid = Grid.fromJSON(gridData);
              
              // Update grid
              state.grid = newGrid;
              
              // Clear selection
              state.ui.selectedIds.clear();
              
              // Add to history
              state.history.past.push(state.history.present);
              state.history.present = newGrid;
              state.history.future = [];
              
              console.log('✅ Grid imported successfully');
            } catch (error) {
              console.error('❌ Failed to import grid:', error);
            }
          });
        }
      }
    };
  })
);