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
import { GridCellAbstraction } from '../lib/grid/GridCellAbstraction';
import type { GridCell } from '../lib/grid/GridCellAbstraction';
import { generateId } from '../lib/utils/precision';
import { GRID_CONSTANTS } from '../lib/constants';
import type { 
  GridPosition, 
  PreciseGridPosition,
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
  gridCellAbstraction: GridCellAbstraction;

  // Pontoon Management
  pontoons: Map<string, PontoonElement>;
  selectedIds: Set<string>;
  hoveredCell: GridPosition | null;
  preciseHoveredCell: PreciseGridPosition | null;

  // UI State
  viewMode: ViewMode;
  selectedTool: Tool;
  currentPontoonType: PontoonType;
  currentPontoonColor: PontoonColor;
  currentLevel: number; // -1 (underwater), 0 (surface), 1 (first deck), 2 (second deck)
  isGridVisible: boolean;
  showCoordinates: boolean;
  
  // Tool State Snapshots - for consistent placement during interactions
  toolStateSnapshot: {
    type: PontoonType;
    color: PontoonColor;
    timestamp: number;
  } | null;

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
  setHoveredCell: (position: GridPosition | null, precisePosition?: PreciseGridPosition | null) => void;
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
  
  // Grid-Cell Abstraction Methods
  canPlaceAtCell: (cell: GridCell, type?: PontoonType) => boolean;
  getPontoonAtCell: (cell: GridCell) => PontoonElement | null;
  isPontoonAtCell: (cell: GridCell) => boolean;
  hasSupportAtCell: (cell: GridCell) => boolean;
  hasSupportAtLevel: (cell: GridCell, level: number) => boolean;
  
  // Advanced Tool Management
  setToolConfiguration: (config: {
    tool?: Tool;
    pontoonType?: PontoonType;
    color?: PontoonColor;
    viewMode?: ViewMode;
  }) => void;
  safeSetTool: (tool: Tool) => boolean;
  snapshotToolState: () => void;
  clearToolStateSnapshot: () => void;
}

export const useConfiguratorStore = create<ConfiguratorState>()(
  subscribeWithSelector(
    devtools(
      immer((set, get) => {
        // Initialize mathematical systems
        const spatialIndex = new SpatialHashGrid(GRID_CONSTANTS.CELL_SIZE_MM);
        const gridMath = new GridMathematics(GRID_CONSTANTS.CELL_SIZE_MM);
        const collisionDetection = new CollisionDetection(spatialIndex, gridMath);
        
        // Initialize Grid-Cell Abstraction Layer
        const gridCellAbstraction = new GridCellAbstraction({ width: 50, height: 50 });

        // Initialize with test pontoons on multiple levels to verify multi-level rendering
        const initialPontoons = new Map<string, PontoonElement>();
        const testPositions = [
          // Level -1 (Underwater Foundation)
          { x: 5, y: -1, z: 5 },    // Underwater support
          { x: 15, y: -1, z: 15 },  // Underwater support
          
          // Level 0 (Water Surface) - Main test positions
          { x: 0, y: 0, z: 0 },     // Grid corner
          { x: 49, y: 0, z: 49 },   // Opposite corner
          { x: 25, y: 0, z: 25 },   // Grid center  
          { x: 10, y: 0, z: 10 },   // Lower left quadrant - Support for Level 1
          { x: 40, y: 0, z: 10 },   // Lower right quadrant
          { x: 10, y: 0, z: 40 },   // Upper left quadrant
          { x: 40, y: 0, z: 40 },   // Upper right quadrant
          { x: 0, y: 0, z: 25 },    // Left edge center
          { x: 49, y: 0, z: 25 },   // Right edge center
          { x: 25, y: 0, z: 0 },    // Bottom edge center
          
          // Level 1 (First Deck) - With support from Level 0
          { x: 10, y: 1, z: 10 },   // Supported by Level 0 pontoon at same position
          
          // No Level 2 test pontoons yet (would need Level 1 support)
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
          
          // CRITICAL FIX: Also add to Grid-Cell Abstraction
          const gridCell: GridCell = { x: pos.x, y: pos.y, z: pos.z };
          gridCellAbstraction.occupyCell(gridCell, id, pontoon.type);
        });

        return {
          // Initial State
          gridSize: { width: 50, height: 50 },
          cellSize: gridMath.getCellSizeMeters(),
          spatialIndex,
          gridMath,
          collisionDetection,
          gridCellAbstraction,

          pontoons: initialPontoons,
          selectedIds: new Set(),
          hoveredCell: null,
          preciseHoveredCell: null,

          viewMode: '3d',
          selectedTool: 'place',
          currentPontoonType: 'single',
          currentPontoonColor: 'blue',
          currentLevel: 0, // Default Level 0 (water surface) for backwards compatibility
          isGridVisible: true,
          showCoordinates: false,
          
          // Tool State Snapshot
          toolStateSnapshot: null,

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
            // Move all logic inside set() to prevent stale state reads
            let success = false;
            
            set((draft) => {
              // Use snapshot state if available for consistent placement during interactions
              const type = draft.toolStateSnapshot?.type || draft.currentPontoonType;
              const color = draft.toolStateSnapshot?.color || draft.currentPontoonColor;
              const currentLevel = draft.currentLevel;
              
              console.log('🎨 TOOL STATE DEBUG:', {
                snapshotAvailable: !!draft.toolStateSnapshot,
                snapshotType: draft.toolStateSnapshot?.type,
                snapshotColor: draft.toolStateSnapshot?.color,
                currentType: draft.currentPontoonType,
                currentColor: draft.currentPontoonColor,
                usingType: type,
                usingColor: color
              });

              console.log('🔨 ADD PONTOON DEBUG:', {
                receivedPosition: position,
                currentLevel,
                type
              });

              // Create temporary state accessor for validation
              const tempState = {
                pontoons: draft.pontoons,
                spatialIndex: draft.spatialIndex,
                currentLevel,
                validatePlacement: get().validatePlacement.bind({ ...draft, pontoons: draft.pontoons, spatialIndex: draft.spatialIndex })
              };

              // Validate placement with draft state
              const validation = get().validatePlacement(position, type);
              if (!validation.valid) {
                console.warn('❌ Cannot place pontoon at', position, ':', validation.errors);
                console.warn('Current level:', currentLevel, 'Position level:', position.y);
                return; // Early return, success remains false
              } else {
                console.log('✅ Pontoon placement validated at', position);
              }

              const id = generateId('pontoon-');
              const pontoon: PontoonElement = {
                id,
                gridPosition: position,
                rotation: 0,
                type,
                color,
                metadata: {
                  createdAt: Date.now(),
                },
              };

              console.log('🔨 PONTOON CREATION DEBUG:', {
                storedGridPosition: pontoon.gridPosition,
                currentLevel,
                positionMatchesLevel: pontoon.gridPosition.y === currentLevel
              });
              // ATOMIC OPERATION: Sync between all three systems
              try {
                // 1. Add to pontoons map
                draft.pontoons.set(id, pontoon);
                
                // 2. Add to spatial index with correct size
                const size = type === 'double' ? { x: 2, y: 1, z: 1 } : { x: 1, y: 1, z: 1 };
                draft.spatialIndex.insert(id, position, size);
                
                // 3. GRID-CELL ABSTRACTION: Occupy cells
                const gridCell: GridCell = { x: position.x, y: position.y, z: position.z };
                draft.gridCellAbstraction.occupyCell(gridCell, id, type);
                
                success = true; // Only set success if all operations complete
              } catch (error) {
                // ROLLBACK: Remove from all systems on failure
                draft.pontoons.delete(id);
                try { draft.spatialIndex.remove(id); } catch {}
                try { 
                  const gridCell: GridCell = { x: position.x, y: position.y, z: position.z };
                  draft.gridCellAbstraction.freeCell(gridCell); 
                } catch {}
                console.error('❌ Failed to add pontoon atomically:', error);
                return; // Early return, success remains false
              }
              
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

              // ATOMIC REMOVAL: Remove from all three systems
              try {
                draft.pontoons.delete(id);
                draft.spatialIndex.remove(id);
                draft.selectedIds.delete(id);
                
                // GRID-CELL ABSTRACTION: Free cells
                const gridCell: GridCell = { x: pontoon.gridPosition.x, y: pontoon.gridPosition.y, z: pontoon.gridPosition.z };
                draft.gridCellAbstraction.freeCell(gridCell);
              } catch (error) {
                // ROLLBACK: Restore to all systems on failure
                if (!draft.pontoons.has(id)) {
                  draft.pontoons.set(id, pontoon);
                  // Re-add to spatial index with correct size
                  const size = pontoon.type === 'double' ? { x: 2, y: 1, z: 1 } : { x: 1, y: 1, z: 1 };
                  draft.spatialIndex.insert(id, pontoon.gridPosition, size);
                  // Re-occupy Grid-Cell
                  const gridCell: GridCell = { x: pontoon.gridPosition.x, y: pontoon.gridPosition.y, z: pontoon.gridPosition.z };
                  draft.gridCellAbstraction.occupyCell(gridCell, id, pontoon.type);
                }
                console.error('❌ Failed to remove pontoon atomically:', error);
                return;
              }
              
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
            let success = false;
            
            set((draft) => {
              const pontoon = draft.pontoons.get(id);
              if (!pontoon) return;
              
              // Validate move within draft context
              const validation = get().collisionDetection.validateMove(id, newPosition, draft.gridSize);
              if (!validation.valid) {
                console.warn('Cannot move pontoon:', validation.errors);
                return;
              }

              const oldPosition = pontoon.gridPosition;

              // Transactional move: Update both pontoon and spatial index atomically
              try {
                pontoon.gridPosition = newPosition;
                draft.spatialIndex.moveElement(id, newPosition);
                success = true;
              } catch (error) {
                // Rollback position if spatial index update fails
                pontoon.gridPosition = oldPosition;
                console.error('❌ Failed to update spatial index for move:', error);
                return;
              }
              
              // Add to history with both old and new positions
              const action: HistoryAction = {
                action: 'move',
                pontoon: { ...pontoon, gridPosition: oldPosition },
                oldPosition,
                newPosition,
                timestamp: Date.now(),
              };
              draft.history = draft.history.slice(0, draft.historyIndex + 1);
              draft.history.push(action);
              draft.historyIndex++;
            });

            return success;
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
          setHoveredCell: (position, precisePosition) => {
            set((draft) => {
              draft.hoveredCell = position;
              draft.preciseHoveredCell = precisePosition || null;
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
            const current = get().currentLevel;
            // DEBUG: Track level changes and block suspicious resets
            if (current !== level) {
              console.log('🔄 LEVEL CHANGE:', { from: current, to: level, stack: new Error().stack?.split('\n').slice(0,3) });
              
              // PROTECTION: Block automatic resets to level 0 from canvas interactions
              // Only allow level 0 if it's explicitly from UI (LevelSelector) or initialization
              if (level === 0 && current > 0) {
                const stack = new Error().stack || '';
                const isFromUI = stack.includes('LevelSelector') || stack.includes('onClick');
                const isFromInit = stack.includes('createStore') || stack.includes('configuratorStore');
                
                if (!isFromUI && !isFromInit) {
                  console.warn('🛡️ BLOCKING suspicious level reset to 0 from:', stack.split('\n')[2]);
                  return; // Block the change
                }
              }
            }
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
              
              // FIX: Use draft state instead of stale get() call
              const gridMath = draft.gridMath;
              const currentPontoonType = draft.currentPontoonType;
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
              // Clear tool state snapshot after multi-drop completion
              draft.toolStateSnapshot = null;
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
              // Clear tool state snapshot on cancel
              draft.toolStateSnapshot = null;
            });
          },

          addPontoonsInArea: (startPos, endPos) => {
            const state = get();
            let positions = state.gridMath.getGridPositionsInArea(startPos, endPos);
            let success = false;
            
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
                // Use draft-consistent lookup instead of stale state
                const existingEntries = Array.from(draft.pontoons.entries()).find(
                  ([_, pontoon]) => 
                    pontoon.gridPosition.x === pos.x && 
                    pontoon.gridPosition.y === pos.y && 
                    pontoon.gridPosition.z === pos.z
                );
                if (existingEntries) {
                  const [existingId] = existingEntries;
                  draft.pontoons.delete(existingId);
                  draft.spatialIndex.remove(existingId);
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
              success = addedIds.length > 0;
              
              // Add to history - use first pontoon as representative for multi-drop
              const firstPontoon = Array.from(draft.pontoons.values()).find(p => 
                positions.some(pos => 
                  p.gridPosition.x === pos.x && p.gridPosition.y === pos.y && p.gridPosition.z === pos.z
                )
              );
              if (firstPontoon) {
                const action: HistoryAction = {
                  action: 'add',
                  pontoon: firstPontoon,
                  timestamp: Date.now(),
                };
                draft.history = draft.history.slice(0, draft.historyIndex + 1);
                draft.history.push(action);
                if (draft.history.length > draft.maxHistorySize) {
                  draft.history = draft.history.slice(-draft.maxHistorySize);
                }
                draft.historyIndex = draft.history.length - 1;
              }
            });
            
            return success;
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
                  // GRID-CELL ABSTRACTION: Free cells during undo
                  const undoGridCell: GridCell = { x: action.pontoon.gridPosition.x, y: action.pontoon.gridPosition.y, z: action.pontoon.gridPosition.z };
                  draft.gridCellAbstraction.freeCell(undoGridCell);
                  break;
                  
                case 'remove':
                  draft.pontoons.set(action.pontoon.id, action.pontoon);
                  // Fix: Add missing size parameter for spatial index consistency
                  const size = action.pontoon.type === 'double' 
                    ? { x: 2, y: 1, z: 1 } 
                    : { x: 1, y: 1, z: 1 };
                  draft.spatialIndex.insert(action.pontoon.id, action.pontoon.gridPosition, size);
                  // GRID-CELL ABSTRACTION: Re-occupy cells during undo
                  const redoGridCell: GridCell = { x: action.pontoon.gridPosition.x, y: action.pontoon.gridPosition.y, z: action.pontoon.gridPosition.z };
                  draft.gridCellAbstraction.occupyCell(redoGridCell, action.pontoon.id, action.pontoon.type);
                  break;
                  
                case 'move':
                  // Undo move: revert to old position
                  const pontoon = draft.pontoons.get(action.pontoon.id);
                  if (pontoon && action.oldPosition) {
                    pontoon.gridPosition = action.oldPosition;
                    draft.spatialIndex.moveElement(action.pontoon.id, action.oldPosition);
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
                  // Fix: Add missing size parameter for consistency
                  const addSize = action.pontoon.type === 'double' ? { x: 2, y: 1, z: 1 } : { x: 1, y: 1, z: 1 };
                  draft.spatialIndex.insert(action.pontoon.id, action.pontoon.gridPosition, addSize);
                  // GRID-CELL ABSTRACTION: Re-occupy cells during redo
                  const redoAddGridCell: GridCell = { x: action.pontoon.gridPosition.x, y: action.pontoon.gridPosition.y, z: action.pontoon.gridPosition.z };
                  draft.gridCellAbstraction.occupyCell(redoAddGridCell, action.pontoon.id, action.pontoon.type);
                  break;
                  
                case 'remove':
                  draft.pontoons.delete(action.pontoon.id);
                  draft.spatialIndex.remove(action.pontoon.id);
                  draft.selectedIds.delete(action.pontoon.id);
                  // GRID-CELL ABSTRACTION: Free cells during redo
                  const redoRemoveGridCell: GridCell = { x: action.pontoon.gridPosition.x, y: action.pontoon.gridPosition.y, z: action.pontoon.gridPosition.z };
                  draft.gridCellAbstraction.freeCell(redoRemoveGridCell);
                  break;
                  
                case 'move':
                  // Redo move: apply the forward move (old -> new)
                  const movePontoon = draft.pontoons.get(action.pontoon.id);
                  if (movePontoon && action.newPosition) {
                    movePontoon.gridPosition = action.newPosition;
                    draft.spatialIndex.moveElement(action.pontoon.id, action.newPosition);
                  }
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

          // GRID-CELL ABSTRACTION: Unified Simple Logic
          canPlacePontoon: (position, type = get().currentPontoonType) => {
            const state = get();
            const gridCell: GridCell = { x: position.x, y: position.y, z: position.z };
            return state.gridCellAbstraction.canPlace(gridCell, type);
          },

          canPlaceAtCell: (cell: GridCell, type = get().currentPontoonType) => {
            const state = get();
            return state.gridCellAbstraction.canPlace(cell, type);
          },

          validatePlacement: (position, type = get().currentPontoonType) => {
            const state = get();
            const gridCell: GridCell = { x: position.x, y: position.y, z: position.z };
            const canPlace = state.gridCellAbstraction.canPlace(gridCell, type);
            
            return {
              valid: canPlace,
              errors: canPlace ? [] : ['Platzierung an dieser Position nicht möglich']
            };
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
              // GRID-CELL ABSTRACTION: Clear all cells
              draft.gridCellAbstraction.clearAllCells();
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
            // UNIFIED GRID-CELL QUERY: Use Grid-Cell Abstraction instead of spatial index
            const gridCell: GridCell = { x: position.x, y: position.y, z: position.z };
            const pontoonId = state.gridCellAbstraction.getPontoonAtCell(gridCell);
            return pontoonId ? state.pontoons.get(pontoonId) || null : null;
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

          // GRID-CELL ABSTRACTION: Simple Queries
          getPontoonAtCell: (cell: GridCell) => {
            const state = get();
            const pontoonId = state.gridCellAbstraction.getPontoonAtCell(cell);
            return pontoonId ? state.pontoons.get(pontoonId) || null : null;
          },

          isPontoonAtCell: (cell: GridCell) => {
            const state = get();
            return state.gridCellAbstraction.getPontoonAtCell(cell) !== null;
          },

          hasSupportAtCell: (cell: GridCell) => {
            const state = get();
            return state.gridCellAbstraction.hasSupport(cell);
          },

          hasSupportAtLevel: (cell: GridCell, level: number) => {
            const state = get();
            return state.gridCellAbstraction.hasSupportAtLevel(cell, level);
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

          // Atomic Tool-State Updates - Fix for race conditions
          setToolConfiguration: (config: {
            tool?: Tool;
            pontoonType?: PontoonType;
            color?: PontoonColor;
            viewMode?: ViewMode;
          }) => {
            set((draft) => {
              // Atomic update of multiple tool properties
              if (config.tool !== undefined) draft.selectedTool = config.tool;
              if (config.pontoonType !== undefined) draft.currentPontoonType = config.pontoonType;
              if (config.color !== undefined) draft.currentPontoonColor = config.color;
              if (config.viewMode !== undefined) draft.viewMode = config.viewMode;
              
              console.log('🔧 ATOMIC TOOL UPDATE:', config);
            });
          },

                  // Safe tool switching with interaction state validation
          safeSetTool: (tool: Tool) => {
            const state = get();
            
            // Prevent tool switching during active interactions
            if (state.isDragging) {
              console.warn('⚠️ Cannot switch tools during active drag operation');
              return false;
            }
            
            set((draft) => {
              draft.selectedTool = tool;
              
              // Auto-configure tool-specific settings
              if (tool === 'multi-drop') {
                draft.currentPontoonType = 'double';
                draft.viewMode = '2d';
              }
              
              // Create tool state snapshot for consistent interactions
              draft.toolStateSnapshot = {
                type: draft.currentPontoonType,
                color: draft.currentPontoonColor,
                timestamp: Date.now()
              };
            });
            
            return true;
          },
          
          // Snapshot tool state for consistent placement
          snapshotToolState: () => {
            set((draft) => {
              draft.toolStateSnapshot = {
                type: draft.currentPontoonType,
                color: draft.currentPontoonColor,
                timestamp: Date.now()
              };
            });
          },
          
          // Clear tool state snapshot
          clearToolStateSnapshot: () => {
            set((draft) => {
              draft.toolStateSnapshot = null;
            });
          },
        };
      }),
      {
        name: 'configurator-store',
        // Persist tool state between sessions
        partialize: (state) => ({
          selectedTool: state.selectedTool,
          currentPontoonType: state.currentPontoonType,
          currentPontoonColor: state.currentPontoonColor,
          viewMode: state.viewMode,
        }),
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