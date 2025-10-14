/**
 * NewPontoonConfigurator - React Component Integration Example
 * 
 * Shows how to integrate the new architecture with React components
 * Demonstrates clean separation between UI and business logic
 */

'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Import new architecture
import { 
  Grid,
  GridPosition,
  PontoonType,
  PontoonColor,
  Rotation,
  GridDimensions
} from '../lib/domain';
import { CoordinateCalculator } from '../lib/domain';
import { 
  RenderingEngine,
  ToolType,
  type PreviewData,
  type SelectionData,
  type PlacementDebugData
} from '../lib/ui';
import { ConfiguratorService } from '../lib/application';
import Image from 'next/image';
import {
  MousePointer2,
  Plus,
  Trash2,
  RotateCw,
  Grid3X3,
  Eye,
  EyeOff,
  Move,
  Maximize2,
  Box,
  Paintbrush,
  ChevronRight
} from 'lucide-react';
import {
  calculateMaterialSummary,
  type MaterialCategory,
  type MaterialSummaryItem
} from '../lib/application/materialSummary';

const PLACEMENT_DEBUG_HIDE_DELAY_MS = 1500;
const MATERIAL_CATEGORY_ORDER: MaterialCategory[] = ['Pontoons', 'Connectors', 'Edge Hardware', 'Accessories'];

interface MaterialGroup {
  category: MaterialCategory;
  items: MaterialSummaryItem[];
}

// UI state interface
interface ConfiguratorUIState {
  grid: Grid;
  currentLevel: number;
  currentTool: ToolType;
  currentPontoonType: PontoonType;
  currentPontoonColor: PontoonColor;
  currentRotation: Rotation;
  hoveredCell: GridPosition | null;
  selectedPontoonIds: Set<string>;
  isGridVisible: boolean;
  viewMode: '2d' | '3d';
  showPreview: boolean;
  showSelection: boolean;
  showSupport: boolean;
  showPlacementDebug: boolean;
  // Drag state for multi-drop and select tools
  isDragging: boolean;
  dragStart: GridPosition | null;
  dragEnd: GridPosition | null;
  dragPreviewPositions: GridPosition[];
  // Move state for move tool
  moveState: 'none' | 'selecting' | 'moving';
  movingPontoonId: string | null;
  // Placement debug helpers
  lastPlacementCells: GridPosition[];
  lastPlacementTimestamp: number | null;
}

function getNewPlacementCells(
  previous: Grid,
  next: Grid,
  fallback: GridPosition[] = []
): GridPosition[] {
  const seen = new Set<string>();
  const cells: GridPosition[] = [];

  for (const [id, pontoon] of next.pontoons.entries()) {
    if (previous.pontoons.has(id)) continue;
    for (const cell of pontoon.getOccupiedPositions()) {
      const key = `${cell.x}:${cell.y}:${cell.z}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cells.push(cell);
    }
  }

  if (cells.length === 0) {
    for (const cell of fallback) {
      const key = `${cell.x}:${cell.y}:${cell.z}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cells.push(cell);
    }
  }

  return cells;
}

// Component props
interface NewPontoonConfiguratorProps {
  initialGridSize?: { width: number; height: number; levels: number };
  onGridChange?: (grid: Grid) => void;
  onError?: (error: string) => void;
}

/**
 * Professional Toolbar Component - Based on proven UI design
 */
interface ProfessionalToolbarProps {
  uiState: ConfiguratorUIState;
  onToolChange: (tool: ToolType) => void;
  onLevelChange: (level: number) => void;
  onPontoonTypeChange: (type: PontoonType) => void;
  onColorChange: (color: PontoonColor) => void;
  onGridToggle: () => void;
  onViewModeToggle: () => void;
  onClearGrid: () => void;
  // 3D models toggle
  onToggle3DModels?: () => void;
  is3DModelsEnabled?: boolean;
}

function ProfessionalToolbar({
  uiState,
  onToolChange,
  onLevelChange,
  onPontoonTypeChange,
  onColorChange,
  onGridToggle,
  onViewModeToggle,
  onClearGrid,
  onToggle3DModels,
  is3DModelsEnabled
}: ProfessionalToolbarProps) {
  
  // Map new architecture tools to UI display
  const tools = [
    { id: ToolType.SELECT, icon: MousePointer2, label: 'Auswählen', shortcut: '1', disabled: false },
    { id: ToolType.PLACE, icon: Plus, label: 'Platzieren', shortcut: '2', disabled: false },
    { id: ToolType.DELETE, icon: Trash2, label: 'Löschen', shortcut: '3', disabled: false },
    { id: ToolType.ROTATE, icon: RotateCw, label: 'Drehen', shortcut: '4', disabled: false },
    { id: ToolType.PAINT, icon: Paintbrush, label: 'Malen', shortcut: '5', disabled: false },
    { id: ToolType.MULTI_DROP, icon: Box, label: 'Multi-Drop', shortcut: '6', disabled: false },
    { id: ToolType.MOVE, icon: Move, label: 'Verschieben', shortcut: '7', disabled: false },
  ];

  const pontoonTypes = [
    { id: PontoonType.SINGLE, label: 'Einzel', icon: '■' },
    { id: PontoonType.DOUBLE, label: 'Doppel', icon: '■■' },
  ];

  const pontoonColors = [
    { id: PontoonColor.BLUE, label: 'Blau', color: '#6183c2' },
    { id: PontoonColor.BLACK, label: 'Schwarz', color: '#111111' },
    { id: PontoonColor.GREY, label: 'Grau', color: '#e3e4e5' },
    { id: PontoonColor.YELLOW, label: 'Gelb', color: '#f7e295' },
  ];

  return (
    <div className="flex flex-col gap-2 bg-white rounded-lg shadow-lg p-3 min-w-48">
      {/* Logo */}
      <div className="flex justify-center mb-1">
        <Image
          src="/logoheader.png"
          alt="Logo"
          width={200}
          height={70}
          className="object-contain"
          priority
        />
      </div>
      
      <div className="h-px bg-gray-300" />
      
      {/* Tool Selection */}
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold text-gray-600 mb-1">Werkzeuge</div>
        <div className="grid grid-cols-2 gap-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => !tool.disabled && onToolChange(tool.id)}
              data-testid={`tool-${tool.id}`}
              disabled={tool.disabled}
              className={`p-2 rounded transition-colors text-sm flex items-center gap-2 ${
                tool.disabled
                  ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  : uiState.currentTool === tool.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title={tool.disabled ? `${tool.label} (noch nicht verfügbar)` : `${tool.label} (${tool.shortcut})`}
            >
              <tool.icon size={16} />
              <span className="text-xs">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Level Selection */}
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold text-gray-600 mb-1">Level</div>
        <div className="flex flex-col gap-1">
          {Array.from({ length: uiState.grid.dimensions.levels }, (_, i) => (
            <button
              key={i}
              onClick={() => onLevelChange(i)}
              data-testid={`level-${i}`}
              className={`px-3 py-2 rounded transition-colors text-sm font-medium ${
                uiState.currentLevel === i
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title={`Level ${i}`}
            >
              Level {i}
            </button>
          ))}
        </div>
      </div>

      {/* Pontoon Type Selection */}
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold text-gray-600 mb-1">Typ</div>
        <div className="grid grid-cols-2 gap-1">
          {pontoonTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => onPontoonTypeChange(type.id)}
              data-testid={`pontoon-${type.id}`}
              className={`p-2 rounded transition-colors text-sm flex items-center gap-2 ${
                uiState.currentPontoonType === type.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <span className="font-mono text-xs">{type.icon}</span>
              <span className="text-xs">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pontoon Color Selection */}
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold text-gray-600 mb-1">Farbe</div>
        <div className="grid grid-cols-2 gap-1">
          {pontoonColors.map((color) => (
            <button
              key={color.id}
              onClick={() => onColorChange(color.id)}
              className={`p-2 rounded transition-colors text-sm flex items-center gap-2 ${
                uiState.currentPontoonColor === color.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <div 
                className="w-4 h-4 rounded border border-gray-300" 
                style={{ backgroundColor: color.color }}
              />
              <span className="text-xs">{color.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-gray-300" />

      {/* View Controls */}
      <div className="flex gap-1">
        <button
          onClick={onGridToggle}
          className={`p-2 rounded transition-colors flex-1 ${
            uiState.isGridVisible
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700'
          }`}
          title="Raster umschalten (G)"
        >
          {uiState.isGridVisible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <button
          onClick={onViewModeToggle}
          className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex-1"
          title="2D/3D Ansicht umschalten"
        >
          {uiState.viewMode === '2d' ? <Box size={16} /> : <Maximize2 size={16} />}
        </button>
        <button
          onClick={onClearGrid}
          data-testid="clear-grid"
          className="p-2 rounded bg-red-100 hover:bg-red-200 text-red-700 transition-colors flex-1"
          title="Alles löschen"
        >
          <Grid3X3 size={16} />
        </button>
      </div>

      <div className="h-px bg-gray-300" />
      
      {/* 3D Model Toggle */}
      <button
        onClick={() => onToggle3DModels && onToggle3DModels()}
        disabled={!onToggle3DModels}
        className={`p-2 rounded transition-colors text-sm font-medium w-full ${
          onToggle3DModels
            ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
        title={onToggle3DModels ? 'Toggle zwischen 3D-Modellen und einfachen Boxen' : 'Rendering-Engine nicht aktiv'}
      >
        {(is3DModelsEnabled ?? false) ? '🏗️ 3D-Modelle' : '📦 Boxen'} Toggle
      </button>

      <div className="h-px bg-gray-300" />

      {/* Stats */}
      <div className="text-xs text-gray-600 space-y-1">
        <div className="flex justify-between">
          <span>Pontons:</span>
          <span className="font-mono" data-testid="pontoon-count">{uiState.grid.getPontoonCount()}</span>
        </div>
        <div className="flex justify-between">
          <span>Ausgewählt:</span>
          <span className="font-mono">{uiState.selectedPontoonIds.size}</span>
        </div>
        <div className="flex justify-between">
          <span>Level:</span>
          <span className="font-mono">{uiState.currentLevel}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Convert screen coordinates to grid position using proper 3D raycasting
 */
function screenToGridPosition(
  screenPos: { x: number; y: number },
  camera: THREE.Camera,
  gridDimensions: GridDimensions,
  currentLevel: number = 0,
  canvasElement?: HTMLCanvasElement | null
): GridPosition | null {
  try {
    const targetCanvas = canvasElement ?? (typeof document !== 'undefined' ? document.querySelector('canvas') : null);
    if (!targetCanvas) return null;
    const rect = targetCanvas.getBoundingClientRect();

    const calculator = new CoordinateCalculator();
    const gridPos = calculator.screenToGrid(
      { x: screenPos.x, y: screenPos.y },
      camera,
      { width: rect.width, height: rect.height },
      gridDimensions,
      currentLevel
    );
    return gridPos;
  } catch (error) {
    console.error('🎯 Screen to grid conversion failed:', error);
    return null;
  }
}

export function NewPontoonConfigurator({
  initialGridSize = { width: 50, height: 50, levels: 3 },
  onGridChange,
  onError
}: NewPontoonConfiguratorProps) {
  // Core state
  const [uiState, setUIState] = useState<ConfiguratorUIState>(() => {
    // Create initial grid
    let initialGrid = Grid.createEmpty(initialGridSize.width, initialGridSize.height, initialGridSize.levels);
    
    // Add demo pontoon in center to showcase 3D model (use SINGLE to avoid double-model dependency)
    const centerPosition = new GridPosition(
      Math.floor(initialGridSize.width / 2),
      0,
      Math.floor(initialGridSize.height / 2)
    );
    try {
      initialGrid = initialGrid.placePontoon(
        centerPosition,
        PontoonType.SINGLE,
        PontoonColor.BLUE,
        Rotation.NORTH
      );
    } catch {
      // ignore demo placement errors
    }
    
    return {
      grid: initialGrid,
      currentLevel: 0,
      currentTool: ToolType.PLACE,
      currentPontoonType: PontoonType.SINGLE,
      currentPontoonColor: PontoonColor.BLUE,
      currentRotation: Rotation.NORTH,
      hoveredCell: null,
      selectedPontoonIds: new Set(),
      isGridVisible: true,
      viewMode: '2d', // Start with 2D view as default
      showPreview: true,
      showSelection: true,
      showSupport: false,
      showPlacementDebug: false,
      // Initialize drag state
      isDragging: false,
      dragStart: null,
      dragEnd: null,
      dragPreviewPositions: [],
      // Initialize move state
      moveState: 'none',
      movingPontoonId: null,
      // Placement debug
      lastPlacementCells: [],
      lastPlacementTimestamp: null
    };
  });

  // Track last click result for debug panel
  const [lastClickResult, setLastClickResult] = useState<string>('PENDING');

  // Services
  const configuratorService = useRef(new ConfiguratorService()).current;

  // Refs for Three.js integration
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderingEngineRef = useRef<RenderingEngine | null>(null);
  const [is3DModelsEnabled, setIs3DModelsEnabled] = useState(false);
  const [isMaterialPanelOpen, setIsMaterialPanelOpen] = useState(true);
  useEffect(() => {
    return () => {
      renderingEngineRef.current?.dispose();
    };
  }, []);

  const materialSummary = useMemo(() => calculateMaterialSummary(uiState.grid), [uiState.grid]);

  const groupedMaterialSummary = useMemo<MaterialGroup[]>(() => {
    if (materialSummary.length === 0) {
      return [];
    }

    const map = new Map<MaterialCategory, MaterialSummaryItem[]>();

    for (const item of materialSummary) {
      const bucket = map.get(item.category);
      if (bucket) {
        bucket.push(item);
      } else {
        map.set(item.category, [item]);
      }
    }

    MATERIAL_CATEGORY_ORDER.forEach(category => {
      const bucket = map.get(category);
      if (bucket) {
        bucket.sort((a, b) => a.label.localeCompare(b.label, 'de-DE'));
      }
    });

    return MATERIAL_CATEGORY_ORDER
      .filter(category => map.has(category))
      .map(category => ({
        category,
        items: map.get(category)!
      }));
  }, [materialSummary]);

  useEffect(() => {
    if (!uiState.lastPlacementCells.length || !uiState.lastPlacementTimestamp) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setUIState(prev => {
        if (prev.lastPlacementTimestamp !== uiState.lastPlacementTimestamp) {
          return prev;
        }
        return {
          ...prev,
          lastPlacementCells: [],
          lastPlacementTimestamp: null
        };
      });
    }, PLACEMENT_DEBUG_HIDE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [uiState.lastPlacementCells.length, uiState.lastPlacementTimestamp, setUIState]);

  // Tool change handler
  const handleToolChange = useCallback((toolType: ToolType) => {
    setUIState(prev => ({ 
      ...prev, 
      currentTool: toolType,
      // Reset move state when changing tools
      moveState: 'none',
      movingPontoonId: null
    }));
    console.log('🔧 Tool changed to:', toolType);
  }, []);

  // Level change handler
  const handleLevelChange = useCallback((level: number) => {
    const maxLevel = uiState.grid.dimensions.levels - 1;
    const clampedLevel = Math.max(0, Math.min(level, maxLevel));
    setUIState(prev => ({ ...prev, currentLevel: clampedLevel }));
    console.log('📏 Level changed to:', clampedLevel);
  }, [uiState.grid.dimensions.levels]);

  // Pontoon type change handler
  const handlePontoonTypeChange = useCallback((type: PontoonType) => {
    setUIState(prev => ({ ...prev, currentPontoonType: type }));
    console.log('🔲 Pontoon type changed to:', type);
  }, []);

  // Pontoon color change handler
  const handleColorChange = useCallback((color: PontoonColor) => {
    setUIState(prev => ({ ...prev, currentPontoonColor: color }));
    console.log('🎨 Color changed to:', color);
  }, []);

  // View mode toggle
  const handleViewModeToggle = useCallback(() => {
    setUIState(prev => ({ 
      ...prev, 
      viewMode: prev.viewMode === '2d' ? '3d' : '2d' 
    }));
  }, []);

  // 3D models toggle handler (delegates to RenderingEngine if available)
  const handleToggle3DModels = useCallback(async () => {
    const engine: any = renderingEngineRef.current as any;
    if (!engine || typeof engine.is3DModelsEnabled !== 'function') return;
    try {
      const next = !engine.is3DModelsEnabled();
      if (typeof engine.toggle3DModels === 'function') {
        await engine.toggle3DModels(next, uiState.grid);
      }
      setIs3DModelsEnabled(next);
      console.log(`Switched to ${next ? '3D models' : 'simple boxes'}`);
    } catch (error) {
      console.error('Failed to toggle 3D models:', error);
    }
  }, [uiState.grid]);

  // Grid visibility toggle
  const handleGridToggle = useCallback(() => {
    setUIState(prev => ({ ...prev, isGridVisible: !prev.isGridVisible }));
  }, []);

  // Rotation handler
  const handleRotationChange = useCallback(() => {
    setUIState(prev => {
      // Cycle through rotations: NORTH -> EAST -> SOUTH -> WEST -> NORTH
      let nextRotation: Rotation;
      switch (prev.currentRotation) {
        case Rotation.NORTH: nextRotation = Rotation.EAST; break;
        case Rotation.EAST: nextRotation = Rotation.SOUTH; break;
        case Rotation.SOUTH: nextRotation = Rotation.WEST; break;
        case Rotation.WEST: nextRotation = Rotation.NORTH; break;
        default: nextRotation = Rotation.NORTH;
      }
      console.log('🔄 Rotation changed to:', nextRotation);
      return { ...prev, currentRotation: nextRotation };
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Tool shortcuts
      switch (event.key) {
        case '1': handleToolChange(ToolType.SELECT); break;
        case '2': handleToolChange(ToolType.PLACE); break;
        case '3': handleToolChange(ToolType.DELETE); break;
        case '4': handleToolChange(ToolType.ROTATE); break;
        case '5': handleToolChange(ToolType.PAINT); break;
        case '6': handleToolChange(ToolType.MULTI_DROP); break;
        case '7': handleToolChange(ToolType.MOVE); break;
        
        // Selection shortcuts
        case 'a': 
          if (event.ctrlKey || event.metaKey) {
            // Ctrl+A: Select all pontoons globally
            const allPontoons = new Set(Array.from(uiState.grid.pontoons.keys()));
            setUIState(prev => ({ ...prev, selectedPontoonIds: allPontoons }));
            setLastClickResult(`Selected all ${allPontoons.size} pontoons`);
          } else {
            // A: Select all pontoons on current level
            const levelPontoons = uiState.grid.getPontoonsAtLevel(uiState.currentLevel);
            const levelIds = new Set(levelPontoons.map(p => p.id));
            setUIState(prev => ({ ...prev, selectedPontoonIds: levelIds }));
            setLastClickResult(`Selected ${levelIds.size} pontoons on level ${uiState.currentLevel}`);
          }
          break;
          
        case 'Escape':
          // Clear selection
          setUIState(prev => ({ ...prev, selectedPontoonIds: new Set() }));
          setLastClickResult('Selection cleared');
          break;
          
        case 'Delete':
        case 'Backspace':
          // Delete selected pontoons
          if (uiState.selectedPontoonIds.size > 0) {
            let newGrid = uiState.grid;
            let deletedCount = 0;
            
            for (const pontoonId of uiState.selectedPontoonIds) {
              try {
                newGrid = newGrid.removePontoon(pontoonId);
                deletedCount++;
              } catch (error) {
                console.warn('Failed to delete pontoon:', pontoonId, error);
              }
            }
            
            setUIState(prev => ({ 
              ...prev, 
              grid: newGrid, 
              selectedPontoonIds: new Set() 
            }));
            setLastClickResult(`Deleted ${deletedCount} selected pontoon(s)`);
          }
          break;
        
        // Level shortcuts
        case 'q': handleLevelChange(0); break;
        case 'w': handleLevelChange(1); break;
        case 'e': handleLevelChange(2); break;
        
        // Type shortcuts
        case 's': handlePontoonTypeChange(PontoonType.SINGLE); break;
        case 'd': handlePontoonTypeChange(PontoonType.DOUBLE); break;
        
        // View shortcuts
        case 'g': handleGridToggle(); break;
        case 'v': handleViewModeToggle(); break;
        
        // Rotation shortcut
        case 'r': handleRotationChange(); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToolChange, handleLevelChange, handlePontoonTypeChange, handleGridToggle, handleViewModeToggle, handleRotationChange, uiState.grid, uiState.currentLevel, uiState.selectedPontoonIds]);

  return (
    <div className="relative w-full h-screen bg-gray-100">
      {/* Three.js Canvas */}
      <Canvas
        data-testid="3d-canvas"
        ref={canvasRef}
        camera={{ 
          position: uiState.viewMode === '2d' ? [0, 25, 0.01] : [20, 20, 20], // True orthographic top-down
          fov: uiState.viewMode === '2d' ? 45 : 50, // Adjusted FOV for full grid visibility
          near: 0.1,
          far: 1000
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
      >
        <color attach="background" args={['#f0f0f0']} />
        
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 5]} intensity={0.8} />
        
        {/* 3D Scene Content */}
       <SceneContent 
          uiState={uiState}
          onRenderingEngineReady={(engine) => {
            renderingEngineRef.current = engine;
            // Initialize 3D models toggle state if supported
            try {
              const isEnabled = (engine as any).is3DModelsEnabled?.() ?? false;
              setIs3DModelsEnabled(!!isEnabled);
            } catch {
              setIs3DModelsEnabled(false);
            }
          }}
          onCanvasHover={(position, camera) => {
            // Update hover state
            const gridPosition = screenToGridPosition(position, camera, uiState.grid.dimensions, uiState.currentLevel, canvasRef.current);
            setUIState(prev => ({ ...prev, hoveredCell: gridPosition }));
          }}
          onDragStart={(position, camera) => {
            console.log('🎯 DRAG START HANDLER CALLED with position:', position);
            const gridPosition = screenToGridPosition(position, camera, uiState.grid.dimensions, uiState.currentLevel, canvasRef.current);
            if (gridPosition) {
              setUIState(prev => ({ 
                ...prev, 
                isDragging: true, 
                dragStart: gridPosition,
                dragEnd: gridPosition,
                dragPreviewPositions: []
              }));
              console.log('🎯 Drag started at grid position:', gridPosition);
            } else {
              console.log('🎯 DRAG START: Failed to convert screen to grid position');
            }
          }}
          onDragMove={(position, camera) => {
            if (uiState.isDragging && uiState.dragStart) {
              const gridPosition = screenToGridPosition(position, camera, uiState.grid.dimensions, uiState.currentLevel, canvasRef.current);
              if (gridPosition) {
                // Calculate preview positions for multi-drop
                let previewPositions: GridPosition[] = [];
                if (uiState.currentTool === ToolType.MULTI_DROP) {
                  const allPositions = GridPosition.getRectangularArea(uiState.dragStart, gridPosition);
                  previewPositions = allPositions.filter(pos => pos.y === uiState.currentLevel);
                  
                  // Filter for double pontoons (place on even grid positions)
                  if (uiState.currentPontoonType === PontoonType.DOUBLE) {
                    const minX = Math.min(uiState.dragStart.x, gridPosition.x);
                    previewPositions = previewPositions.filter(pos => {
                      const relativeX = pos.x - minX;
                      return relativeX % 2 === 0;
                    });
                  }
                }
                
                setUIState(prev => ({ 
                  ...prev, 
                  dragEnd: gridPosition,
                  dragPreviewPositions: previewPositions
                }));
              }
            }
          }}
          onDragEnd={(position, camera) => {
            console.log('🎯 DRAG END HANDLER CALLED with position:', position, 'isDragging:', uiState.isDragging);
            
            // Use the most recent drag start from state, or fallback to checking if we have proper drag conditions
            const dragStart = uiState.dragStart;
            const gridPosition = screenToGridPosition(position, camera, uiState.grid.dimensions, uiState.currentLevel, canvasRef.current);
            
            if (dragStart && gridPosition) {
              console.log('🎯 DRAG END: Grid position:', gridPosition, 'Start:', dragStart);
              if (uiState.currentTool === ToolType.MULTI_DROP) {
                  // Execute multi-drop
                  const allPositions = GridPosition.getRectangularArea(dragStart, gridPosition);
                  let filteredPositions = allPositions.filter(pos => pos.y === uiState.currentLevel);
                  
                  console.log('🎯 MULTI-DROP: Area positions:', allPositions.length, 'Filtered:', filteredPositions.length);
                  
                  // Filter for double pontoons
                  if (uiState.currentPontoonType === PontoonType.DOUBLE) {
                    const minX = Math.min(dragStart.x, gridPosition.x);
                    filteredPositions = filteredPositions.filter(pos => {
                      const relativeX = pos.x - minX;
                      return relativeX % 2 === 0;
                    });
                  }
                  
                  // Execute batch placement using ConfiguratorService
                  const result = configuratorService.placePontoonsBatch(uiState.grid, {
                    positions: filteredPositions,
                    type: uiState.currentPontoonType,
                    color: uiState.currentPontoonColor,
                    rotation: uiState.currentRotation,
                    skipInvalid: true
                  });
                  
                  if (result.success && result.grid) {
                    const placementCells = getNewPlacementCells(uiState.grid, result.grid, filteredPositions);
                    setUIState(prev => ({
                      ...prev,
                      grid: result.grid,
                      lastPlacementCells: placementCells,
                      lastPlacementTimestamp: Date.now()
                    }));
                    setLastClickResult(`Multi-drop: ${result.successCount} pontoons placed`);
                  } else {
                    setLastClickResult(`Multi-drop failed: ${result.errors.join(', ')}`);
                  }
                }
              }
              
              // Reset drag state
              setUIState(prev => ({ 
                ...prev, 
                isDragging: false, 
                dragStart: null,
                dragEnd: null,
                dragPreviewPositions: []
              }));
            }
          }
          onCanvasClick={(position, camera, event) => {
            console.log('🎯 Canvas clicked at screen position:', position);
            
            try {
              // Convert screen position to grid coordinates
              const gridPosition = screenToGridPosition(position, camera, uiState.grid.dimensions, uiState.currentLevel, canvasRef.current);
              
              if (!gridPosition) {
                setLastClickResult('FAILED: Could not convert screen position to grid');
                return;
              }
              
              console.log('🎯 Tool:', uiState.currentTool, 'at grid position:', gridPosition);
              
              if (uiState.currentTool === ToolType.PLACE) {
                // Place pontoon
                const newGrid = uiState.grid.placePontoon(
                  gridPosition,
                  uiState.currentPontoonType,
                  uiState.currentPontoonColor,
                  uiState.currentRotation
                );
                
                console.log('🎯 Placement successful! New grid:', newGrid);
                const placementCells = getNewPlacementCells(uiState.grid, newGrid, [gridPosition]);
                setUIState(prev => ({
                  ...prev,
                  grid: newGrid,
                  lastPlacementCells: placementCells,
                  lastPlacementTimestamp: Date.now()
                }));
                setLastClickResult('SUCCESS');
                
              } else if (uiState.currentTool === ToolType.DELETE) {
                // Delete pontoon at position
                if (uiState.grid.hasPontoonAt(gridPosition)) {
                  const newGrid = uiState.grid.removePontoonAt(gridPosition);
                  console.log('🗑️ Deletion successful! New grid:', newGrid);
                  setUIState(prev => ({ ...prev, grid: newGrid }));
                  setLastClickResult('SUCCESS');
                } else {
                  setLastClickResult('FAILED: No pontoon at position');
                }
              } else if (uiState.currentTool === ToolType.SELECT) {
                // Handle selection - Enhanced with Ctrl+click support
                const pontoon = uiState.grid.getPontoonAt(gridPosition);
                const newSelection = new Set(uiState.selectedPontoonIds);
                
                if (!pontoon) {
                  // Click on empty space - clear selection unless Ctrl is held
                  if (!event?.ctrlKey) {
                    newSelection.clear();
                    setLastClickResult('Selection cleared');
                  } else {
                    setLastClickResult('Empty space (Ctrl held - selection preserved)');
                  }
                } else {
                  // Handle pontoon selection based on modifiers
                  if (event?.ctrlKey) {
                    // Ctrl+click: toggle individual pontoon
                    if (newSelection.has(pontoon.id)) {
                      newSelection.delete(pontoon.id);
                      setLastClickResult(`Deselected: ${pontoon.id} (${newSelection.size} total)`);
                    } else {
                      newSelection.add(pontoon.id);
                      setLastClickResult(`Selected: ${pontoon.id} (${newSelection.size} total)`);
                    }
                  } else {
                    // Normal click: single selection
                    newSelection.clear();
                    newSelection.add(pontoon.id);
                    setLastClickResult(`Selected: ${pontoon.id} (1 total)`);
                  }
                }
                
                setUIState(prev => ({ ...prev, selectedPontoonIds: newSelection }));
                console.log('🎯 Selection updated:', newSelection.size, 'pontoons selected');
                
              } else if (uiState.currentTool === ToolType.ROTATE) {
                const pontoon = uiState.grid.getPontoonAt(gridPosition);
                if (!pontoon) {
                  setLastClickResult('FAILED: No pontoon to rotate at this position');
                } else {
                  const nextRotation = (() => {
                    switch (pontoon.rotation) {
                      case Rotation.NORTH: return Rotation.EAST;
                      case Rotation.EAST: return Rotation.SOUTH;
                      case Rotation.SOUTH: return Rotation.WEST;
                      case Rotation.WEST:
                      default:
                        return Rotation.NORTH;
                    }
                  })();

                  try {
                    const newGrid = uiState.grid.rotatePontoon(pontoon.id, nextRotation);
                    setUIState(prev => ({
                      ...prev,
                      grid: newGrid
                    }));
                    setLastClickResult('SUCCESS');
                    console.log('🔄 Rotate tool: Rotated pontoon', pontoon.id, 'to', nextRotation);
                  } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    setLastClickResult(`FAILED: Rotate failed - ${message}`);
                    console.error('🔄 Rotate tool: Rotation failed:', error);
                  }
                }
                
              } else if (uiState.currentTool === ToolType.MULTI_DROP) {
                // Multi-drop tool: single click places one pontoon (like Place tool)
                const newGrid = uiState.grid.placePontoon(
                  gridPosition,
                  uiState.currentPontoonType,
                  uiState.currentPontoonColor,
                  uiState.currentRotation
                );
                
                console.log('🎯 Multi-drop single placement successful! New grid:', newGrid);
                setUIState(prev => ({ ...prev, grid: newGrid }));
                setLastClickResult('SUCCESS: Single pontoon placed (drag for multi-drop)');
                
              } else if (uiState.currentTool === ToolType.PAINT) {
                // Paint tool: change color of pontoon at position
                const pontoon = uiState.grid.getPontoonAt(gridPosition);
                if (!pontoon) {
                  setLastClickResult('FAILED: No pontoon to paint at this position');
                } else if (pontoon.color === uiState.currentPontoonColor) {
                  setLastClickResult('NO-OP: Pontoon already has selected color');
                } else {
                  try {
                    const newGrid = uiState.grid.updatePontoonColor(pontoon.id, uiState.currentPontoonColor);
                    setUIState(prev => ({ ...prev, grid: newGrid }));
                    setLastClickResult(`SUCCESS: Painted ${pontoon.id} → ${uiState.currentPontoonColor}`);
                    console.log('🎨 Paint tool: Updated color for pontoon:', pontoon.id, 'to', uiState.currentPontoonColor);
                  } catch (error) {
                    setLastClickResult(`FAILED: Paint failed - ${error.message}`);
                    console.error('🎨 Paint tool: Paint failed:', error);
                  }
                }
                
              } else if (uiState.currentTool === ToolType.MOVE) {
                // Move tool: Two-click pattern - select then move
                if (uiState.moveState === 'none') {
                  // First click - select pontoon to move
                  const pontoon = uiState.grid.getPontoonAt(gridPosition);
                  if (!pontoon) {
                    setLastClickResult('FAILED: No pontoon to move at this position');
                  } else {
                    setUIState(prev => ({ 
                      ...prev, 
                      moveState: 'moving',
                      movingPontoonId: pontoon.id,
                      selectedPontoonIds: new Set([pontoon.id])
                    }));
                    setLastClickResult(`Selected pontoon ${pontoon.id} for moving. Click destination.`);
                    console.log('🎯 Move tool: Selected pontoon for moving:', pontoon.id);
                  }
                } else if (uiState.moveState === 'moving' && uiState.movingPontoonId) {
                  // Second click - move pontoon to destination
                  const pontoonId = uiState.movingPontoonId;
                  const pontoon = uiState.grid.pontoons.get(pontoonId);
                  
                  if (!pontoon) {
                    setLastClickResult('FAILED: Selected pontoon not found');
                    setUIState(prev => ({ 
                      ...prev, 
                      moveState: 'none',
                      movingPontoonId: null,
                      selectedPontoonIds: new Set()
                    }));
                  } else if (pontoon.position.equals(gridPosition)) {
                    setLastClickResult('FAILED: Pontoon is already at this position');
                  } else {
                    try {
                      const newGrid = uiState.grid.movePontoon(pontoonId, gridPosition);
                      setUIState(prev => ({ 
                        ...prev, 
                        grid: newGrid, 
                        moveState: 'none',
                        movingPontoonId: null,
                        selectedPontoonIds: new Set() // Clear selection after move
                      }));
                      setLastClickResult(`SUCCESS: Pontoon moved from ${pontoon.position.toString()} to ${gridPosition.toString()}`);
                      console.log('🎯 Move tool: Pontoon moved successfully:', pontoonId, 'to', gridPosition.toString());
                    } catch (error) {
                      setLastClickResult(`FAILED: Move failed - ${error.message}`);
                      console.error('🎯 Move tool: Move failed:', error);
                      // Reset move state on error
                      setUIState(prev => ({ 
                        ...prev, 
                        moveState: 'none',
                        movingPontoonId: null,
                        selectedPontoonIds: new Set()
                      }));
                    }
                  }
                }
                
              } else {
                setLastClickResult(`FAILED: Tool ${uiState.currentTool} not implemented`);
              }
              
            } catch (error) {
              console.error('🎯 Action failed:', error);
              setLastClickResult(`FAILED: ${error.message}`);
            }
          }}
        />
      </Canvas>

      {/* Professional UI Overlay - Based on proven design */}
      <div className="absolute top-4 left-4 z-10">
        <ProfessionalToolbar 
          uiState={uiState}
          onToolChange={handleToolChange}
          onLevelChange={handleLevelChange}
          onPontoonTypeChange={handlePontoonTypeChange}
          onColorChange={handleColorChange}
          onGridToggle={handleGridToggle}
          onViewModeToggle={handleViewModeToggle}
          onClearGrid={() => {
            const emptyGrid = Grid.createEmpty(uiState.grid.dimensions.width, uiState.grid.dimensions.height, uiState.grid.dimensions.levels);
            setUIState(prev => ({ ...prev, grid: emptyGrid }));
          }}
          onToggle3DModels={handleToggle3DModels}
          is3DModelsEnabled={is3DModelsEnabled}
        />
      </div>

      {/* Material Summary Panel */}
      <div className="absolute top-4 right-4 z-10 flex items-start gap-2">
        <div
          className={`transition-all duration-300 ${
            isMaterialPanelOpen ? 'opacity-100 translate-x-0' : 'opacity-0 pointer-events-none translate-x-4'
          }`}
        >
          <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg border border-gray-200 w-72 max-h-[80vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Materialliste</h3>
              <span className="text-xs font-mono text-gray-500">{materialSummary.length}</span>
            </div>
            {groupedMaterialSummary.length === 0 ? (
              <p className="text-xs text-gray-500">Noch keine Materialien platziert.</p>
            ) : (
              <div className="space-y-4">
                {groupedMaterialSummary.map(group => (
                  <div key={group.category}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      {group.category}
                    </div>
                    <ul className="space-y-1">
                      {group.items.map(item => (
                        <li key={item.id} className="flex items-center justify-between text-sm text-gray-700">
                          <span className="pr-2">{item.label}</span>
                          <span className="font-mono text-xs text-gray-900">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsMaterialPanelOpen(prev => !prev)}
          className="bg-white/90 backdrop-blur border border-gray-200 rounded-l-lg shadow flex flex-col items-center gap-1 px-2 py-3 hover:bg-white transition-colors"
          title="Materialliste ein-/ausblenden"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 select-none">
            Materialliste
          </span>
          <ChevronRight
            size={16}
            className={`transition-transform ${isMaterialPanelOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>


      {/* Debug Panel */}
      <div className="absolute bottom-4 left-4 z-10" data-testid="debug-panel">
        <div className="bg-black bg-opacity-80 text-white rounded-lg shadow-lg p-4 font-mono text-xs">
          <h3 className="text-sm font-semibold mb-2">Debug Info</h3>
          <div className="space-y-1">
            {uiState.hoveredCell ? (
              <>
                <div>Hover: ({uiState.hoveredCell.x}, {uiState.hoveredCell.y}, {uiState.hoveredCell.z})</div>
                <div>Grid-Cell-Can-Place: {uiState.grid.canPlacePontoon(uiState.hoveredCell, uiState.currentPontoonType) ? '✅' : '❌'}</div>
                <div>Pontoon-Here: {uiState.grid.hasPontoonAt(uiState.hoveredCell) ? 'YES' : 'NO'}</div>
                {(() => {
                  const pontoon = uiState.grid.getPontoonAt(uiState.hoveredCell);
                  return pontoon ? (
                    <>
                      <div>Pontoon-Rotation: {pontoon.rotation}°</div>
                      <div>Pontoon-Color: {pontoon.color}</div>
                    </>
                  ) : null;
                })()}
              </>
            ) : (
              <>
                <div>Hover: No position</div>
                <div>Grid-Cell-Can-Place: N/A</div>
                <div>Pontoon-Here: N/A</div>
              </>
            )}
            <div>Last-Click: {lastClickResult}</div>
            <div>Tool: {uiState.currentTool}</div>
            <div>Level: {uiState.currentLevel}</div>
            <div>Rotation: {uiState.currentRotation}°</div>
            <div>Current-Color: {uiState.currentPontoonColor}</div>
            <div>Selected-Pontoons: {uiState.selectedPontoonIds.size}</div>
            {uiState.selectedPontoonIds.size > 0 && (
              <div>Selected-IDs: {Array.from(uiState.selectedPontoonIds).join(', ')}</div>
            )}
            <div>Move-State: {uiState.moveState}</div>
            {uiState.movingPontoonId && (
              <div>Moving-Pontoon: {uiState.movingPontoonId}</div>
            )}
            <div>Drag-State: {uiState.isDragging ? 'active' : 'none'}</div>
            {uiState.isDragging && uiState.dragStart && uiState.dragEnd && (
              <div>Drag-Area: ({uiState.dragStart.x},{uiState.dragStart.z}) to ({uiState.dragEnd.x},{uiState.dragEnd.z})</div>
            )}
            <div>Preview-Pontoons: {uiState.dragPreviewPositions.length}</div>
            {uiState.currentTool === ToolType.MULTI_DROP && uiState.dragPreviewPositions.length > 0 && (
              <div>Multi-Drop-Mode: {uiState.currentPontoonType === PontoonType.DOUBLE ? 'Double (every 2nd)' : 'Single'}</div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

/**
 * Scene Content Component - Handles Three.js rendering
 */
function SceneContent({ 
  uiState, 
  onRenderingEngineReady,
  onCanvasHover,
  onCanvasClick,
  onDragStart,
  onDragMove,
  onDragEnd
}: { 
  uiState: ConfiguratorUIState;
  onRenderingEngineReady: (engine: RenderingEngine) => void;
  onCanvasHover?: (position: { x: number; y: number }, camera: THREE.Camera) => void;
  onCanvasClick?: (position: { x: number; y: number }, camera: THREE.Camera, event?: MouseEvent) => void;
  onDragStart?: (position: { x: number; y: number }, camera: THREE.Camera) => void;
  onDragMove?: (position: { x: number; y: number }, camera: THREE.Camera) => void;
  onDragEnd?: (position: { x: number; y: number }, camera: THREE.Camera) => void;
}) {
  const { scene, gl, camera } = useThree();
  const renderingEngineRef = useRef<RenderingEngine | null>(null);

  // Initialize rendering engine (with safe fallback)
  useEffect(() => {
    if (renderingEngineRef.current) return;
    try {
      const engine = new RenderingEngine(scene, { use3DModels: true });
      renderingEngineRef.current = engine;
      onRenderingEngineReady(engine);
      console.log('🎨 RenderingEngine enabled');
      return () => {
        try { engine.dispose(); } catch {}
        renderingEngineRef.current = null;
      };
    } catch (error) {
      console.error('🎨 RenderingEngine failed during initialization:', error);
      throw error;
    }
  }, [scene, onRenderingEngineReady]);

  // Update rendering engine options
  useEffect(() => {
    renderingEngineRef.current?.updateOptions({
      showGrid: uiState.isGridVisible,
      showPreview: uiState.showPreview,
      showSelection: uiState.showSelection,
      showSupport: uiState.showSupport,
      showPlacementDebug: uiState.showPlacementDebug
    });
  }, [
    uiState.isGridVisible,
    uiState.showPreview,
    uiState.showSelection,
    uiState.showSupport,
    uiState.showPlacementDebug
  ]);

  // Drag state refs to avoid closure issues
  const dragStateRef = useRef({
    isMouseDown: false,
    dragStartPos: null as { x: number; y: number } | null,
    hasDragged: false,
    modifierKeys: {
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false
    }
  });

  // Add interaction handlers with drag support
  useEffect(() => {
    if (!gl.domElement) return;

    const dragThreshold = 5; // pixels

    const getEventPosition = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    };

    const handleMouseDown = (event: MouseEvent) => {
      dragStateRef.current.isMouseDown = true;
      dragStateRef.current.hasDragged = false;
      dragStateRef.current.dragStartPos = getEventPosition(event);
      
      // Capture modifier keys during mousedown
      dragStateRef.current.modifierKeys = {
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey
      };
      
      
      // Only start drag for tools that support it
      if ((uiState.currentTool === ToolType.MULTI_DROP || uiState.currentTool === ToolType.SELECT) && onDragStart) {
        console.log('🎯 Potential drag start at:', dragStateRef.current.dragStartPos);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const currentPos = getEventPosition(event);
      
      // Always update hover
      if (onCanvasHover) {
        onCanvasHover(currentPos, camera);
      }

      // Handle dragging
      if (dragStateRef.current.isMouseDown && dragStateRef.current.dragStartPos) {
        const dragDistance = Math.sqrt(
          Math.pow(currentPos.x - dragStateRef.current.dragStartPos.x, 2) + 
          Math.pow(currentPos.y - dragStateRef.current.dragStartPos.y, 2)
        );

        if (dragDistance > dragThreshold && !dragStateRef.current.hasDragged) {
          // Start drag
          dragStateRef.current.hasDragged = true;
          console.log('🎯 DRAG THRESHOLD EXCEEDED:', dragDistance, 'px, hasDragged now:', dragStateRef.current.hasDragged);
          if ((uiState.currentTool === ToolType.MULTI_DROP || uiState.currentTool === ToolType.SELECT) && onDragStart) {
            onDragStart(dragStateRef.current.dragStartPos, camera);
            console.log('🎯 Drag started at:', dragStateRef.current.dragStartPos);
          }
        }

        if (dragStateRef.current.hasDragged && onDragMove) {
          onDragMove(currentPos, camera);
        }
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      const currentPos = getEventPosition(event);
      
      console.log('🎯 MOUSE UP - hasDragged:', dragStateRef.current.hasDragged, 'position:', currentPos);
      
      if (dragStateRef.current.hasDragged && onDragEnd) {
        // End drag
        console.log('🎯 EXECUTING DRAG END');
        onDragEnd(currentPos, camera);
        console.log('🎯 Drag ended at:', currentPos);
      } else if (!dragStateRef.current.hasDragged && onCanvasClick) {
        // Regular click (no drag)
        console.log('🎯 EXECUTING CLICK (no drag detected)');
        // Create a synthetic event with the captured modifier keys
        const syntheticEvent = {
          ...event,
          ctrlKey: dragStateRef.current.modifierKeys.ctrlKey,
          altKey: dragStateRef.current.modifierKeys.altKey,
          shiftKey: dragStateRef.current.modifierKeys.shiftKey,
          metaKey: dragStateRef.current.modifierKeys.metaKey
        };
        onCanvasClick(currentPos, camera, syntheticEvent);
      }

      // Reset drag state
      dragStateRef.current.isMouseDown = false;
      dragStateRef.current.dragStartPos = null;
      dragStateRef.current.hasDragged = false;
      dragStateRef.current.modifierKeys = {
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false
      };
    };

    const handleMouseLeave = () => {
      // Cancel any ongoing drag
      if (dragStateRef.current.hasDragged && onDragEnd && dragStateRef.current.dragStartPos) {
        onDragEnd(dragStateRef.current.dragStartPos, camera);
      }
      dragStateRef.current.isMouseDown = false;
      dragStateRef.current.dragStartPos = null;
      dragStateRef.current.hasDragged = false;
      dragStateRef.current.modifierKeys = {
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false
      };
    };

    // Add event listeners
    gl.domElement.addEventListener('mousedown', handleMouseDown);
    gl.domElement.addEventListener('mousemove', handleMouseMove);
    gl.domElement.addEventListener('mouseup', handleMouseUp);
    gl.domElement.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
      gl.domElement.removeEventListener('mouseup', handleMouseUp);
      gl.domElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [gl.domElement, onCanvasClick, onCanvasHover, onDragStart, onDragMove, onDragEnd, camera, uiState.currentTool]);

  // Render frame
  useEffect(() => {
    if (!renderingEngineRef.current) return;

    const renderFrame = async () => {
      if (!renderingEngineRef.current) return;

      try {
        const shouldShowPreview =
          uiState.hoveredCell !== null &&
          (uiState.currentTool === ToolType.PLACE || uiState.currentTool === ToolType.MULTI_DROP);

        const previewData: PreviewData | undefined = shouldShowPreview && uiState.hoveredCell ? {
          position: uiState.hoveredCell,
          type: uiState.currentPontoonType,
          color: uiState.currentPontoonColor,
          isValid: uiState.grid.canPlacePontoon(uiState.hoveredCell, uiState.currentPontoonType),
          rotation: uiState.currentRotation
        } : undefined;

        const selectionIds = new Set(uiState.selectedPontoonIds);
        if (uiState.currentTool === ToolType.DELETE && uiState.hoveredCell) {
          const pontoonToDelete = uiState.grid.getPontoonAt(uiState.hoveredCell);
          if (pontoonToDelete) {
            selectionIds.add(pontoonToDelete.id);
          }
        }

        const selectionData: SelectionData = {
          pontoonIds: selectionIds
        };

        const activePlacementCells =
          uiState.isDragging && uiState.dragPreviewPositions.length > 0
            ? uiState.dragPreviewPositions
            : uiState.lastPlacementCells;

        const placementDebugData: PlacementDebugData | undefined =
          uiState.showPlacementDebug && activePlacementCells.length > 0
            ? { cells: activePlacementCells }
            : undefined;

        await renderingEngineRef.current.render(
          uiState.grid,
          uiState.currentLevel,
          previewData,
          selectionData,
          undefined,
          placementDebugData,
          uiState.hoveredCell
        );
      } catch (error) {
        console.error('🎨 Render frame failed:', error);
      }
    };

    renderFrame();
  });
  return (
    <>
      {/* 3D Camera Controls */}
      {uiState.viewMode === '3d' && (
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1.5}
          maxDistance={100}
          maxPolarAngle={Math.PI / 2.2} // Prevent going too low below the grid
          dampingFactor={0.05}
          enableDamping={true}
        />
      )}
    </>
  );
}
