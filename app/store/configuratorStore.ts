/**
 * ConfiguratorStore - Mathematical Precision State Management
 * 
 * Integrates Zustand with SpatialHashGrid for optimal performance
 * All state changes maintain mathematical exactness
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// Enable Map/Set support in Immer
enableMapSet();
import { SpatialHashGrid } from '../lib/grid/SpatialHashGrid';
import { GridMathematics } from '../lib/grid/GridMathematics';
import { CollisionDetection } from '../lib/grid/CollisionDetection';
import { generateId } from '../lib/utils/precision';
import { GRID_CONSTANTS } from '../lib/constants';
import type { 
  GridPosition, 
  PontoonElement, 
  Tool, 
  ViewMode, 
  PontoonType,
  PontoonColor,
  HistoryAction,
  ValidationResult 
} from '../types';

interface ConfiguratorState {
  // Grid System
  gridSize: { width: number; height: number };
  cellSize: number;
  spatialIndex: SpatialHashGrid;
  gridMath: GridMathematics;
  collisionDetection: CollisionDetection;

  // Pontoon Management
  pontoons: Map<string, PontoonElement>;
  selectedIds: Set<string>;
  hoveredCell: GridPosition | null;

  // UI State
  viewMode: ViewMode;
  selectedTool: Tool;
  currentPontoonType: PontoonType;
  currentPontoonColor: PontoonColor;
  currentLevel: number; // -1 (underwater), 0 (surface), 1 (first deck), 2 (second deck)
  isGridVisible: boolean;
  showCoordinates: boolean;

  // Multi-Drop State
  dragStart: GridPosition | null;
  dragEnd: GridPosition | null;
  dragStartMouse: { x: number; y: number } | null;
  dragEndMouse: { x: number; y: number } | null;
  isDragging: boolean;
  previewPositions: Set<string>;

  // History
  history: HistoryAction[];
  historyIndex: number;
  maxHistorySize: number;

  // Actions - Pontoon Management
  addPontoon: (position: GridPosition) => boolean;
  removePontoon: (id: string) => void;
  movePontoon: (id: string, newPosition: GridPosition) => boolean;
  rotatePontoon: (id: string) => void;
  
  // Actions - Selection
  selectPontoon: (id: string, multi?: boolean) => void;
  selectMultiple: (ids: string[]) => void;
  clearSelection: () => void;
  selectAll: () => void;
  
  // Actions - UI State
  setHoveredCell: (position: GridPosition | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setTool: (tool: Tool) => void;
  setPontoonType: (type: PontoonType) => void;
  setPontoonColor: (color: PontoonColor) => void;
  setCurrentLevel: (level: number) => void;
  setGridVisible: (visible: boolean) => void;
  setShowCoordinates: (show: boolean) => void;
  
  // Actions - Multi-Drop
  startDrag: (position: GridPosition, mousePos: { x: number; y: number }) => void;
  updateDrag: (position: GridPosition, mousePos: { x: number; y: number }) => void;
  endDrag: () => void;
  cancelDrag: () => void;
  addPontoonsInArea: (startPos: GridPosition, endPos: GridPosition) => boolean;
  
  // Actions - History
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  
  // Actions - Validation
  canPlacePontoon: (position: GridPosition, type?: PontoonType) => boolean;
  validatePlacement: (position: GridPosition, type?: PontoonType) => ValidationResult;
  validatePlatformConnectivity: () => ValidationResult;
  
  // Actions - Bulk Operations
  deleteSelected: () => void;
  clearGrid: () => void;
  duplicateSelected: (offset: GridPosition) => void;
  
  // Getters
  getOccupiedCells: () => Map<string, string>;
  getPontoonAt: (position: GridPosition) => PontoonElement | null;
  getSelectedPontoons: () => PontoonElement[];
  getPontoonCount: () => number;
  getGridStats: () => {
    totalCells: number;
    occupiedCells: number;
    pontoonCount: number;
    selectedCount: number;
  };
}

export const useConfiguratorStore = create<ConfiguratorState>()(
  subscribeWithSelector(
    devtools(
      immer((set, get) => {
        // Initialize mathematical systems
        const spatialIndex = new SpatialHashGrid(GRID_CONSTANTS.CELL_SIZE_MM);
        const gridMath = new GridMathematics(GRID_CONSTANTS.CELL_SIZE_MM);
        const collisionDetection = new CollisionDetection(spatialIndex, gridMath);

        // Initialize with test pontoons distributed across entire grid to verify rendering
        const initialPontoons = new Map<string, PontoonElement>();
        const testPositions = [
          { x: 0, y: 0, z: 0 },     // Grid corner
          { x: 49, y: 0, z: 49 },   // Opposite corner
          { x: 25, y: 0, z: 25 },   // Grid center  
          { x: 10, y: 0, z: 10 },   // Lower left quadrant
          { x: 40, y: 0, z: 10 },   // Lower right quadrant
          { x: 10, y: 0, z: 40 },   // Upper left quadrant
          { x: 40, y: 0, z: 40 },   // Upper right quadrant
          { x: 0, y: 0, z: 25 },    // Left edge center
          { x: 49, y: 0, z: 25 },   // Right edge center
          { x: 25, y: 0, z: 0 },    // Bottom edge center
          { x: 25, y: 0, z: 49 },   // Top edge center
          { x: 12, y: 0, z: 37 },   // Random position 1
          { x: 33, y: 0, z: 8 },    // Random position 2
        ];

        testPositions.forEach((pos, index) => {
          const id = `test-pontoon-${index}`;
          const isDouble = index % 4 === 0; // Every 4th pontoon is double
          const colors: PontoonColor[] = ['blue', 'black', 'gray', 'yellow'];
          const pontoon: PontoonElement = {
            id,
            gridPosition: pos,
            rotation: 0,
            type: isDouble ? 'double' : 'single',
            color: colors[index % 4],
            metadata: { createdAt: Date.now() },
          };
          initialPontoons.set(id, pontoon);
          // For double pontoons, insert into spatial index with size 2x1
          const size = isDouble ? { x: 2, y: 1, z: 1 } : { x: 1, y: 1, z: 1 };
          spatialIndex.insert(id, pos, size);
        });

        return {
          // Initial State
          gridSize: { width: 50, height: 50 },
          cellSize: gridMath.getCellSizeMeters(),
          spatialIndex,
          gridMath,
          collisionDetection,

          pontoons: initialPontoons,
          selectedIds: new Set(),
          hoveredCell: null,

          viewMode: '3d',
          selectedTool: 'place',
          currentPontoonType: 'single',
          currentPontoonColor: 'blue',
          currentLevel: 0, // Default Level 0 (water surface) for backwards compatibility
          isGridVisible: true,
          showCoordinates: false,

          // Multi-Drop State
          dragStart: null,
          dragEnd: null,
          dragStartMouse: null,
          dragEndMouse: null,
          isDragging: false,
          previewPositions: new Set(),

          history: [],
          historyIndex: -1,
          maxHistorySize: 100,

          // Pontoon Management Actions
          addPontoon: (position) => {
            const state = get();
            const type = state.currentPontoonType;

            // Validate placement
            const validation = state.validatePlacement(position, type);
            if (!validation.valid) {
              console.warn('Cannot place pontoon:', validation.errors);
              return false;
            }

            const id = generateId('pontoon-');
            const pontoon: PontoonElement = {
              id,
              gridPosition: position,
              rotation: 0,
              type,
              color: state.currentPontoonColor,
              metadata: {
                createdAt: Date.now(),
              },
            };

            set((draft) => {
              // Add to pontoons map
              draft.pontoons.set(id, pontoon);
              
              // Add to spatial index with correct size
              const size = type === 'double' ? { x: 2, y: 1, z: 1 } : { x: 1, y: 1, z: 1 };
              draft.spatialIndex.insert(id, position, size);
              
              // Add to history
              const action: HistoryAction = {
                action: 'add',
                pontoon,
                timestamp: Date.now(),
              };
              draft.history = draft.history.slice(0, draft.historyIndex + 1);
              draft.history.push(action);
              draft.historyIndex++;
              
              // Trim history if too long
              if (draft.history.length > draft.maxHistorySize) {
                draft.history.shift();
                draft.historyIndex--;
              }
            });

            return true;
          },

          removePontoon: (id) => {
            set((draft) => {
              const pontoon = draft.pontoons.get(id);
              if (!pontoon) return;

              // Remove from pontoons map
              draft.pontoons.delete(id);
              
              // Remove from spatial index
              draft.spatialIndex.remove(id);
              
              // Remove from selection
              draft.selectedIds.delete(id);
              
              // Add to history
              const action: HistoryAction = {
                action: 'remove',
                pontoon,
                timestamp: Date.now(),
              };
              draft.history = draft.history.slice(0, draft.historyIndex + 1);
              draft.history.push(action);
              draft.historyIndex++;
            });
          },

          movePontoon: (id, newPosition) => {
            const state = get();
            
            // Validate move
            const validation = state.collisionDetection.validateMove(id, newPosition, state.gridSize);
            if (!validation.valid) {
              console.warn('Cannot move pontoon:', validation.errors);
              return false;
            }

            set((draft) => {
              const pontoon = draft.pontoons.get(id);
              if (!pontoon) return;

              const oldPosition = pontoon.gridPosition;

              // Update pontoon position
              pontoon.gridPosition = newPosition;
              
              // Update spatial index
              draft.spatialIndex.moveElement(id, newPosition);
              
              // Add to history
              const action: HistoryAction = {
                action: 'move',
                pontoon: { ...pontoon, gridPosition: oldPosition },
                timestamp: Date.now(),
              };
              draft.history = draft.history.slice(0, draft.historyIndex + 1);
              draft.history.push(action);
              draft.historyIndex++;
            });

            return true;
          },

          rotatePontoon: (id) => {
            set((draft) => {
              const pontoon = draft.pontoons.get(id);
              if (!pontoon) return;

              const oldRotation = pontoon.rotation;
              pontoon.rotation = (pontoon.rotation + 90) % 360;
              
              // Add to history
              const action: HistoryAction = {
                action: 'rotate',
                pontoon: { ...pontoon, rotation: oldRotation },
                timestamp: Date.now(),
              };
              draft.history = draft.history.slice(0, draft.historyIndex + 1);
              draft.history.push(action);
              draft.historyIndex++;
            });
          },

          // Selection Actions
          selectPontoon: (id, multi = false) => {
            set((draft) => {
              if (!multi) {
                draft.selectedIds.clear();
              }
              draft.selectedIds.add(id);
            });
          },

          selectMultiple: (ids) => {
            set((draft) => {
              draft.selectedIds.clear();
              ids.forEach(id => draft.selectedIds.add(id));
            });
          },

          clearSelection: () => {
            set((draft) => {
              draft.selectedIds.clear();
            });
          },

          selectAll: () => {
            set((draft) => {
              draft.selectedIds.clear();
              draft.pontoons.forEach((_, id) => draft.selectedIds.add(id));
            });
          },

          // UI State Actions
          setHoveredCell: (position) => {
            set((draft) => {
              draft.hoveredCell = position;
            });
          },

          setViewMode: (mode) => {
            set((draft) => {
              draft.viewMode = mode;
            });
          },

          setTool: (tool) => {
            set((draft) => {
              draft.selectedTool = tool;
            });
          },

          setPontoonType: (type) => {
            set((draft) => {
              draft.currentPontoonType = type;
            });
          },

          setPontoonColor: (color) => {
            set((draft) => {
              draft.currentPontoonColor = color;
            });
          },

          setCurrentLevel: (level) => {
            set((draft) => {
              draft.currentLevel = level;
            });
          },

          setGridVisible: (visible) => {
            set((draft) => {
              draft.isGridVisible = visible;
            });
          },

          setShowCoordinates: (show) => {
            set((draft) => {
              draft.showCoordinates = show;
            });
          },

          // Multi-Drop Actions
          startDrag: (position, mousePos) => {
            set((draft) => {
              draft.isDragging = true;
              draft.dragStart = position;
              draft.dragEnd = position;
              draft.dragStartMouse = mousePos;
              draft.dragEndMouse = mousePos;
              draft.previewPositions.clear();
            });
          },

          updateDrag: (position, mousePos) => {
            set((draft) => {
              if (!draft.isDragging || !draft.dragStart) return;
              
              // DEBUG: Log drag updates
              if (Math.random() < 0.1) { // Only log 10% of updates to avoid spam
                console.log('🔍 UpdateDrag:', {
                  dragStart: draft.dragStart,
                  newPosition: position,
                  mousePos
                });
              }
              
              draft.dragEnd = position;
              draft.dragEndMouse = mousePos;
              
              // Calculate preview positions in drag area
              const { gridMath, currentPontoonType } = get();
              let positions = gridMath.getGridPositionsInArea(draft.dragStart, position);
              
              // Apply spacing logic for double pontoons in preview
              if (currentPontoonType === 'double') {
                // Calculate area bounds for relative positioning
                const minX = Math.min(draft.dragStart.x, position.x);
                const maxX = Math.max(draft.dragStart.x, position.x);
                
                // Filter positions to use every 2nd position WITHIN the drag area
                positions = positions.filter(pos => {
                  const relativeX = pos.x - minX;
                  return relativeX % 2 === 0;
                });
              }
              
              draft.previewPositions.clear();
              positions.forEach(pos => {
                const key = `${pos.x},${pos.y},${pos.z}`;
                draft.previewPositions.add(key);
              });
            });
          },

          endDrag: () => {
            const state = get();
            if (!state.isDragging || !state.dragStart || !state.dragEnd) return;
            
            console.log('🔍 EndDrag Debug:');
            console.log('dragStart:', state.dragStart);
            console.log('dragEnd:', state.dragEnd);
            console.log('isDragging:', state.isDragging);
            
            // Perform batch placement
            const success = state.addPontoonsInArea(state.dragStart, state.dragEnd);
            
            set((draft) => {
              draft.isDragging = false;
              draft.dragStart = null;
              draft.dragEnd = null;
              draft.dragStartMouse = null;
              draft.dragEndMouse = null;
              draft.previewPositions.clear();
            });
            
            return success;
          },

          cancelDrag: () => {
            set((draft) => {
              draft.isDragging = false;
              draft.dragStart = null;
              draft.dragEnd = null;
              draft.dragStartMouse = null;
              draft.dragEndMouse = null;
              draft.previewPositions.clear();
            });
          },

          addPontoonsInArea: (startPos, endPos) => {
            const state = get();
            let positions = state.gridMath.getGridPositionsInArea(startPos, endPos);
            
            // DEBUG: Log area calculation
            console.log('🔍 Multi-Drop Debug:');
            console.log('Start position:', startPos);
            console.log('End position:', endPos);
            console.log('Total positions found:', positions.length);
            console.log('Area bounds:', {
              minX: Math.min(startPos.x, endPos.x),
              maxX: Math.max(startPos.x, endPos.x),
              minZ: Math.min(startPos.z, endPos.z),
              maxZ: Math.max(startPos.z, endPos.z)
            });
            
            if (positions.length === 0) return false;
            
            // For double pontoons, apply intelligent spacing to avoid overlaps
            if (state.currentPontoonType === 'double') {
              // Calculate area bounds for relative positioning
              const minX = Math.min(startPos.x, endPos.x);
              const maxX = Math.max(startPos.x, endPos.x);
              
              const positionsBeforeFilter = positions.length;
              
              // Filter positions to use every 2nd position WITHIN the drag area
              // This allows full area coverage while preventing 2x1 overlaps
              positions = positions.filter(pos => {
                const relativeX = pos.x - minX;
                return relativeX % 2 === 0;
              });
              
              console.log('Double pontoon filtering:', {
                before: positionsBeforeFilter,
                after: positions.length,
                minX,
                maxX
              });
            }
            
            set((draft) => {
              // Remove existing pontoons in area
              positions.forEach(pos => {
                const existing = state.getPontoonAt(pos);
                if (existing) {
                  draft.pontoons.delete(existing.id);
                  draft.spatialIndex.remove(existing.id);
                }
              });
              
              // Add pontoons of current type at all positions
              const addedIds: string[] = [];
              console.log('🔍 Adding pontoons at positions:', positions.slice(0, 10), '... (showing first 10)');
              
              positions.forEach((pos, index) => {
                const id = generateId('pontoon-multi-');
                const pontoon: PontoonElement = {
                  id,
                  gridPosition: pos,
                  rotation: 0,
                  type: draft.currentPontoonType,
                  color: draft.currentPontoonColor,
                  metadata: { createdAt: Date.now(), multiDrop: true },
                };
                
                // Use correct size based on pontoon type
                const size = draft.currentPontoonType === 'double' 
                  ? { x: 2, y: 1, z: 1 } 
                  : { x: 1, y: 1, z: 1 };
                
                draft.pontoons.set(id, pontoon);
                draft.spatialIndex.insert(id, pos, size);
                addedIds.push(id);
                
                // Debug first few placements
                if (index < 5) {
                  console.log(`🔍 Placed pontoon ${index}:`, { pos, id, type: draft.currentPontoonType });
                }
              });
              
              console.log(`🔍 Total pontoons added: ${addedIds.length}`);
              
              // Add to history as single action
              const action: HistoryAction = {
                action: 'multi-drop' as any,
                pontoons: positions.map(pos => {
                  const pontoon = Array.from(draft.pontoons.values()).find(p => 
                    p.gridPosition.x === pos.x && p.gridPosition.y === pos.y && p.gridPosition.z === pos.z
                  );
                  return pontoon!;
                }),
                area: { start: startPos, end: endPos },
                timestamp: Date.now(),
              };
              
              draft.history = draft.history.slice(0, draft.historyIndex + 1);
              draft.history.push(action);
              draft.historyIndex++;
            });
            
            return true;
          },

          // History Actions
          undo: () => {
            const { history, historyIndex } = get();
            if (historyIndex < 0) return;

            const action = history[historyIndex];
            set((draft) => {
              switch (action.action) {
                case 'add':
                  draft.pontoons.delete(action.pontoon.id);
                  draft.spatialIndex.remove(action.pontoon.id);
                  draft.selectedIds.delete(action.pontoon.id);
                  break;
                  
                case 'remove':
                  draft.pontoons.set(action.pontoon.id, action.pontoon);
                  draft.spatialIndex.insert(action.pontoon.id, action.pontoon.gridPosition);
                  break;
                  
                case 'move':
                  const pontoon = draft.pontoons.get(action.pontoon.id);
                  if (pontoon) {
                    pontoon.gridPosition = action.pontoon.gridPosition;
                    draft.spatialIndex.moveElement(action.pontoon.id, action.pontoon.gridPosition);
                  }
                  break;
                  
                case 'rotate':
                  const rotatePontoon = draft.pontoons.get(action.pontoon.id);
                  if (rotatePontoon) {
                    rotatePontoon.rotation = action.pontoon.rotation;
                  }
                  break;
              }
              
              draft.historyIndex--;
            });
          },

          redo: () => {
            const { history, historyIndex } = get();
            if (historyIndex >= history.length - 1) return;

            const action = history[historyIndex + 1];
            set((draft) => {
              switch (action.action) {
                case 'add':
                  draft.pontoons.set(action.pontoon.id, action.pontoon);
                  draft.spatialIndex.insert(action.pontoon.id, action.pontoon.gridPosition);
                  break;
                  
                case 'remove':
                  draft.pontoons.delete(action.pontoon.id);
                  draft.spatialIndex.remove(action.pontoon.id);
                  draft.selectedIds.delete(action.pontoon.id);
                  break;
                  
                case 'move':
                  // For redo, we need to move to the NEW position, not the old one
                  // This requires storing both old and new positions in the action
                  // For now, we'll skip this implementation
                  break;
                  
                case 'rotate':
                  const pontoon = draft.pontoons.get(action.pontoon.id);
                  if (pontoon) {
                    pontoon.rotation = (action.pontoon.rotation + 90) % 360;
                  }
                  break;
              }
              
              draft.historyIndex++;
            });
          },

          clearHistory: () => {
            set((draft) => {
              draft.history = [];
              draft.historyIndex = -1;
            });
          },

          // Validation Actions
          canPlacePontoon: (position, type = get().currentPontoonType) => {
            const validation = get().validatePlacement(position, type);
            return validation.valid;
          },

          validatePlacement: (position, type = get().currentPontoonType) => {
            const state = get();
            return state.collisionDetection.validatePlacement(
              position,
              type,
              state.gridSize
            );
          },

          validatePlatformConnectivity: () => {
            return get().collisionDetection.validatePlatformConnectivity();
          },

          // Bulk Operations
          deleteSelected: () => {
            const state = get();
            const selectedIds = Array.from(state.selectedIds);
            selectedIds.forEach(id => state.removePontoon(id));
          },

          clearGrid: () => {
            set((draft) => {
              draft.pontoons.clear();
              draft.spatialIndex.clear();
              draft.selectedIds.clear();
              draft.clearHistory();
            });
          },

          duplicateSelected: (offset) => {
            const state = get();
            const selectedPontoons = state.getSelectedPontoons();
            
            selectedPontoons.forEach(pontoon => {
              const newPosition = {
                x: pontoon.gridPosition.x + offset.x,
                y: pontoon.gridPosition.y + offset.y,
                z: pontoon.gridPosition.z + offset.z,
              };
              
              if (state.canPlacePontoon(newPosition, pontoon.type)) {
                state.addPontoon(newPosition);
              }
            });
          },

          // Getters
          getOccupiedCells: () => {
            const state = get();
            const occupied = new Map<string, string>();

            state.pontoons.forEach((pontoon) => {
              const key = state.gridMath.getGridKey(pontoon.gridPosition);
              occupied.set(key, pontoon.id);
            });

            return occupied;
          },

          getPontoonAt: (position) => {
            const state = get();
            const elementIds = state.spatialIndex.getElementsAtPosition(position);
            
            if (elementIds.length > 0) {
              return state.pontoons.get(elementIds[0]) || null;
            }
            
            return null;
          },

          getSelectedPontoons: () => {
            const state = get();
            return Array.from(state.selectedIds)
              .map(id => state.pontoons.get(id))
              .filter((pontoon): pontoon is PontoonElement => pontoon !== undefined);
          },

          getPontoonCount: () => {
            return get().pontoons.size;
          },

          getGridStats: () => {
            const state = get();
            return {
              totalCells: state.gridSize.width * state.gridSize.height,
              occupiedCells: state.spatialIndex.getOccupiedCellCount(),
              pontoonCount: state.pontoons.size,
              selectedCount: state.selectedIds.size,
            };
          },
        };
      }),
      {
        name: 'configurator-store',
      }
    )
  )
);

// Development helper for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__PONTOON_DEBUG__ = {
    store: useConfiguratorStore,
    getGrid: () => useConfiguratorStore.getState().spatialIndex,
    getMath: () => useConfiguratorStore.getState().gridMath,
    getCollision: () => useConfiguratorStore.getState().collisionDetection,
    placeRandom: (count: number = 10) => {
      const state = useConfiguratorStore.getState();
      let placed = 0;
      
      for (let i = 0; i < count * 10 && placed < count; i++) {
        const x = Math.floor(Math.random() * state.gridSize.width);
        const z = Math.floor(Math.random() * state.gridSize.height);
        const position = { x, y: 0, z };
        
        if (state.addPontoon(position)) {
          placed++;
        }
      }
      
      console.log(`Placed ${placed} random pontoons`);
    },
    clearAll: () => {
      useConfiguratorStore.getState().clearGrid();
      console.log('Cleared all pontoons');
    },
    validateGrid: () => {
      const spatial = useConfiguratorStore.getState().spatialIndex;
      const isValid = spatial.validateConsistency();
      console.log('Grid validation:', isValid ? 'PASSED' : 'FAILED');
      return isValid;
    },
    getStats: () => {
      const spatial = useConfiguratorStore.getState().spatialIndex;
      const stats = spatial.getStats();
      console.table(stats);
      return stats;
    },
  };
}