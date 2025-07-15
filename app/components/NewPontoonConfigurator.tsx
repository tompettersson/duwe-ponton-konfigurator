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
  DOMAIN_CONSTANTS,
  getPontoonTypeConfig,
  getPontoonColorConfig,
  GridDimensions
} from '../lib/domain';
import { 
  InteractionController,
  RenderingEngine,
  ToolSystem,
  ToolType,
  type InteractionCallbacks,
  type RenderingOptions,
  type PreviewData,
  type SelectionData,
  type ToolContext
} from '../lib/ui';
import { ConfiguratorService } from '../lib/application';
import Image from 'next/image';
import {
  MousePointer2,
  Plus,
  Trash2,
  RotateCw,
  Undo2,
  Redo2,
  Grid3X3,
  Eye,
  EyeOff,
  Square,
  Maximize2,
  Box,
  Paintbrush
} from 'lucide-react';

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
  // Drag state for multi-drop and select tools
  isDragging: boolean;
  dragStart: GridPosition | null;
  dragEnd: GridPosition | null;
  dragPreviewPositions: GridPosition[];
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
}

function ProfessionalToolbar({
  uiState,
  onToolChange,
  onLevelChange,
  onPontoonTypeChange,
  onColorChange,
  onGridToggle,
  onViewModeToggle,
  onClearGrid
}: ProfessionalToolbarProps) {
  
  // Map new architecture tools to UI display
  const tools = [
    { id: ToolType.SELECT, icon: MousePointer2, label: 'Auswählen', shortcut: '1', disabled: false },
    { id: ToolType.PLACE, icon: Plus, label: 'Platzieren', shortcut: '2', disabled: false },
    { id: ToolType.DELETE, icon: Trash2, label: 'Löschen', shortcut: '3', disabled: false },
    { id: ToolType.ROTATE, icon: RotateCw, label: 'Drehen', shortcut: '4', disabled: false },
    { id: ToolType.PAINT, icon: Paintbrush, label: 'Malen', shortcut: '5', disabled: false },
    { id: ToolType.MULTI_DROP, icon: Box, label: 'Multi-Drop', shortcut: '6', disabled: false },
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
  currentLevel: number = 0
): GridPosition | null {
  try {
    // Get canvas element and its dimensions
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      console.error('🎯 Canvas element not found');
      return null;
    }
    
    const rect = canvas.getBoundingClientRect();
    
    // Convert to normalized device coordinates [-1, 1]
    const mouse = new THREE.Vector2();
    mouse.x = ((screenPos.x / rect.width) * 2) - 1;
    mouse.y = -((screenPos.y / rect.height) * 2) + 1;
    
    // Create raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // Calculate intersection with horizontal plane at current level manually
    // Ray equation: origin + direction * t
    // Plane equation: y = levelY
    const levelY = currentLevel * 0.4; // 0.4m height per level
    
    const ray = raycaster.ray;
    const rayOrigin = ray.origin;
    const rayDirection = ray.direction;
    
    // Find t where ray.y = levelY
    // rayOrigin.y + rayDirection.y * t = levelY
    // t = (levelY - rayOrigin.y) / rayDirection.y
    
    if (Math.abs(rayDirection.y) < 0.0001) {
      // Ray is parallel to plane
      console.log('🎯 Ray is parallel to grid plane');
      return null;
    }
    
    const t = (levelY - rayOrigin.y) / rayDirection.y;
    
    if (t < 0) {
      // Intersection is behind the camera
      console.log('🎯 Intersection behind camera');
      return null;
    }
    
    // Calculate intersection point
    const worldPos = new THREE.Vector3();
    worldPos.copy(rayOrigin).add(rayDirection.clone().multiplyScalar(t));
    
    // Convert world coordinates to grid coordinates
    // Grid is centered at world origin, with 0.5m spacing
    // World range: [-gridWidth/2 * 0.5, +gridWidth/2 * 0.5] 
    // Grid range: [0, gridWidth-1]
    const gridX = Math.round(worldPos.x / 0.5 + (gridDimensions.width - 1) / 2);
    const gridZ = Math.round(worldPos.z / 0.5 + (gridDimensions.height - 1) / 2);
    
    // Validate bounds
    if (gridX >= 0 && gridX < gridDimensions.width && 
        gridZ >= 0 && gridZ < gridDimensions.height) {
      
      console.log(`🎯 Screen (${screenPos.x}, ${screenPos.y}) → World (${worldPos.x.toFixed(2)}, ${worldPos.z.toFixed(2)}) → Grid (${gridX}, ${currentLevel}, ${gridZ})`);
      return new GridPosition(gridX, currentLevel, gridZ);
    } else {
      console.log(`🎯 Grid position out of bounds: (${gridX}, ${gridZ}) for grid size ${gridDimensions.width}x${gridDimensions.height}`);
    }
    
    return null;
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
  const [uiState, setUIState] = useState<ConfiguratorUIState>(() => ({
    grid: Grid.createEmpty(initialGridSize.width, initialGridSize.height, initialGridSize.levels),
    currentLevel: 0,
    currentTool: ToolType.PLACE,
    currentPontoonType: PontoonType.SINGLE,
    currentPontoonColor: PontoonColor.BLUE,
    currentRotation: Rotation.NORTH,
    hoveredCell: null,
    selectedPontoonIds: new Set(),
    isGridVisible: true,
    viewMode: '3d',
    showPreview: true,
    showSelection: true,
    showSupport: false,
    // Initialize drag state
    isDragging: false,
    dragStart: null,
    dragEnd: null,
    dragPreviewPositions: []
  }));

  // Track last click result for debug panel
  const [lastClickResult, setLastClickResult] = useState<string>('PENDING');

  // Services
  const configuratorService = useRef(new ConfiguratorService()).current;

  // Refs for Three.js integration
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interactionControllerRef = useRef<InteractionController | null>(null);
  const renderingEngineRef = useRef<RenderingEngine | null>(null);
  const toolSystemRef = useRef<ToolSystem | null>(null);

  // Statistics state
  const [stats, setStats] = useState({
    pontoonCount: 0,
    renderFPS: 0,
    interactionLatency: 0
  });

  // Interaction callbacks
  const interactionCallbacks: InteractionCallbacks = useMemo(() => ({
    onGridUpdate: (newGrid: Grid) => {
      setUIState(prev => ({ ...prev, grid: newGrid }));
      onGridChange?.(newGrid);
      console.log('✅ Grid updated:', newGrid.getPontoonCount(), 'pontoons');
    },

    onHoverUpdate: (position: GridPosition | null) => {
      setUIState(prev => ({ ...prev, hoveredCell: position }));
    },

    onSelectionUpdate: (selectedIds: Set<string>) => {
      setUIState(prev => ({ ...prev, selectedPontoonIds: selectedIds }));
    },

    onPreviewUpdate: (hasPreview: boolean) => {
      setUIState(prev => ({ ...prev, showPreview: hasPreview }));
    },

    onError: (error: string) => {
      console.error('❌ Interaction error:', error);
      onError?.(error);
    }
  }), [onGridChange, onError]);

  // Initialize systems when canvas is ready
  useEffect(() => {
    if (!canvasRef.current) return;

    console.log('🎮 Initializing new architecture systems...');

    // TEMPORARILY DISABLED - These systems need more implementation
    // const interactionController = new InteractionController(interactionCallbacks);
    // const toolSystem = new ToolSystem();
    
    // Store refs
    // interactionControllerRef.current = interactionController;
    // toolSystemRef.current = toolSystem;

    // Initialize interaction controller with canvas
    // interactionController.initialize(canvasRef.current);

    // Activate default tool
    // toolSystem.activateTool(uiState.currentTool);

    // Cleanup function
    return () => {
      // interactionController.cleanup();
      // toolSystem.cleanup();
      renderingEngineRef.current?.dispose();
    };
  }, [interactionCallbacks, uiState.currentTool]);

  // Tool change handler
  const handleToolChange = useCallback((toolType: ToolType) => {
    setUIState(prev => ({ ...prev, currentTool: toolType }));
    toolSystemRef.current?.activateTool(toolType);
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
        case '5': handleToolChange(ToolType.MULTI_DROP); break;
        case '6': handleToolChange(ToolType.MOVE); break;
        case '7': handleToolChange(ToolType.PAINT); break;
        
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

  // Update statistics when grid changes
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      pontoonCount: uiState.grid.getPontoonCount()
    }));
  }, [uiState.grid]);

  // Update other statistics periodically  
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        renderFPS: renderingEngineRef.current?.getStats()?.lastRenderTime || 0,
        interactionLatency: interactionControllerRef.current?.getStats()?.averageResponseTime || 0
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-screen bg-gray-100">
      {/* Three.js Canvas */}
      <Canvas
        ref={canvasRef}
        camera={{ 
          position: uiState.viewMode === '2d' ? [0, 50, 0] : [20, 20, 20],
          fov: 50,
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
          }}
          onCanvasHover={(position, camera) => {
            // Update hover state
            const gridPosition = screenToGridPosition(position, camera, uiState.grid.dimensions, uiState.currentLevel);
            setUIState(prev => ({ ...prev, hoveredCell: gridPosition }));
          }}
          onDragStart={(position, camera) => {
            console.log('🎯 DRAG START HANDLER CALLED with position:', position);
            const gridPosition = screenToGridPosition(position, camera, uiState.grid.dimensions, uiState.currentLevel);
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
              const gridPosition = screenToGridPosition(position, camera, uiState.grid.dimensions, uiState.currentLevel);
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
            const gridPosition = screenToGridPosition(position, camera, uiState.grid.dimensions, uiState.currentLevel);
            
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
                    setUIState(prev => ({ ...prev, grid: result.grid }));
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
              const gridPosition = screenToGridPosition(position, camera, uiState.grid.dimensions, uiState.currentLevel);
              
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
                setUIState(prev => ({ ...prev, grid: newGrid }));
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
        />
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

  // Initialize rendering engine - DISABLED to prevent pink rendering issues
  useEffect(() => {
    if (!renderingEngineRef.current) {
      // IMPORTANT: RenderingEngine is causing pink/magenta rendering issues
      // Using fallback Three.js rendering instead
      console.log('🎨 Using fallback rendering (RenderingEngine disabled)');
      renderingEngineRef.current = null;
      
      // Create a dummy engine for stats
      onRenderingEngineReady({
        render: () => {},
        updateOptions: () => {},
        dispose: () => {},
        getStats: () => ({ lastRenderTime: 0 })
      } as any);
    }
  }, [scene, onRenderingEngineReady]);

  // Update rendering engine options
  useEffect(() => {
    renderingEngineRef.current?.updateOptions({
      showGrid: uiState.isGridVisible,
      showPreview: uiState.showPreview,
      showSelection: uiState.showSelection,
      showSupport: uiState.showSupport
    });
  }, [uiState.isGridVisible, uiState.showPreview, uiState.showSelection, uiState.showSupport]);

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

    try {
      // Prepare render data
      const previewData: PreviewData | undefined = uiState.hoveredCell ? {
        position: uiState.hoveredCell,
        type: uiState.currentPontoonType,
        color: uiState.currentPontoonColor,
        isValid: uiState.grid.canPlacePontoon(uiState.hoveredCell, uiState.currentPontoonType)
      } : undefined;

      const selectionData: SelectionData = {
        pontoonIds: uiState.selectedPontoonIds
      };

      // Render frame
      renderingEngineRef.current.render(
        uiState.grid,
        uiState.currentLevel,
        previewData,
        selectionData
      );
    } catch (error) {
      console.error('🎨 Render frame failed, disabling RenderingEngine:', error);
      // Disable the rendering engine to force fallback
      renderingEngineRef.current = null;
    }
  });

  // FALLBACK: Simple Three.js rendering if RenderingEngine fails
  return (
    <>
      {/* 3D Camera Controls */}
      {uiState.viewMode === '3d' && (
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={100}
          maxPolarAngle={Math.PI / 2.2} // Prevent going too low below the grid
          dampingFactor={0.05}
          enableDamping={true}
        />
      )}
      
      
      {/* Render pontoons as simple boxes */}
      {Array.from(uiState.grid.pontoons.entries()).map(([id, pontoon]) => {
        try {
          const config = getPontoonTypeConfig(pontoon.type);
          const colorConfig = getPontoonColorConfig(pontoon.color);
          
          // Validate configuration
          if (!config || !colorConfig) {
            console.error('🎨 Invalid pontoon configuration:', { id, type: pontoon.type, color: pontoon.color });
            return null;
          }
          
          // Calculate position with bounds checking
          let x = (pontoon.position.x - (uiState.grid.dimensions.width - 1) / 2) * 0.5;
          const y = pontoon.position.y * 0.4;
          let z = (pontoon.position.z - (uiState.grid.dimensions.height - 1) / 2) * 0.5;
          
          // Offset double pontoons to center them properly
          if (pontoon.type === PontoonType.DOUBLE) {
            if (pontoon.rotation === Rotation.NORTH || pontoon.rotation === Rotation.SOUTH) {
              // Double pontoon extends in X direction, offset by half a cell
              x += 0.25;
            } else {
              // Double pontoon extends in Z direction, offset by half a cell
              z += 0.25;
            }
          }
          
          // Check for invalid positions (might cause phantom pontoons)
          if (Math.abs(x) > 25 || Math.abs(z) > 25 || y < -1 || y > 10) {
            console.warn('🎨 PHANTOM PONTOON DETECTED:', { 
              id, 
              gridPos: pontoon.position, 
              worldPos: { x, y, z },
              type: pontoon.type,
              color: pontoon.color
            });
          }
          
          // Check if pontoon is selected
          const isSelected = uiState.selectedPontoonIds.has(id);
          
          // Use original dimensions - rotation will handle the orientation
          const width = config.dimensions.widthMM / 1000;
          const depth = config.dimensions.depthMM / 1000;
          
          // Calculate rotation angle in radians
          const rotationY = (pontoon.rotation * Math.PI) / 180;
          
          return (
            <group key={id}>
              {/* Main pontoon mesh */}
              <mesh
                position={[x, y, z]}
                rotation={[0, rotationY, 0]}
              >
                <boxGeometry args={[width, 0.4, depth]} />
                <meshStandardMaterial 
                  color={colorConfig.hex} 
                  transparent={false}
                  opacity={1.0}
                />
              </mesh>
              
              {/* Selection highlight */}
              {isSelected && (
                <mesh
                  position={[x, y + 0.005, z]}
                  rotation={[0, rotationY, 0]}
                >
                  <boxGeometry args={[width + 0.02, 0.41, depth + 0.02]} />
                  <meshStandardMaterial 
                    color="#4A90FF" 
                    transparent={true}
                    opacity={0.4}
                    emissive="#4A90FF"
                    emissiveIntensity={0.3}
                  />
                </mesh>
              )}
            </group>
          );
        } catch (error) {
          console.error('🎨 Error rendering pontoon:', id, error);
          return null;
        }
      }).filter(Boolean)}
      
      {/* Hover Preview - Show transparent pontoon at hovered position */}
      {uiState.hoveredCell && uiState.currentTool === ToolType.PLACE && (() => {
        const config = getPontoonTypeConfig(uiState.currentPontoonType);
        const colorConfig = getPontoonColorConfig(uiState.currentPontoonColor);
        const canPlace = uiState.grid.canPlacePontoon(uiState.hoveredCell, uiState.currentPontoonType);
        
        if (!config || !colorConfig) return null;
        
        let x = (uiState.hoveredCell.x - (uiState.grid.dimensions.width - 1) / 2) * 0.5;
        const y = uiState.hoveredCell.y * 0.4;
        let z = (uiState.hoveredCell.z - (uiState.grid.dimensions.height - 1) / 2) * 0.5;
        
        // Offset double pontoons to center them properly
        if (uiState.currentPontoonType === PontoonType.DOUBLE) {
          if (uiState.currentRotation === Rotation.NORTH || uiState.currentRotation === Rotation.SOUTH) {
            // Double pontoon extends in X direction, offset by half a cell
            x += 0.25;
          } else {
            // Double pontoon extends in Z direction, offset by half a cell
            z += 0.25;
          }
        }
        
        // Use original dimensions - rotation will handle the orientation
        const width = config.dimensions.widthMM / 1000;
        const depth = config.dimensions.depthMM / 1000;
        
        // Calculate rotation angle in radians
        const rotationY = (uiState.currentRotation * Math.PI) / 180;
        
        return (
          <mesh position={[x, y, z]} rotation={[0, rotationY, 0]}>
            <boxGeometry args={[width, 0.4, depth]} />
            <meshStandardMaterial 
              color={canPlace ? colorConfig.hex : '#ff0000'} 
              transparent={true}
              opacity={0.5}
            />
          </mesh>
        );
      })()}
      
      {/* Delete Tool Hover - Highlight pontoon to be deleted */}
      {uiState.hoveredCell && uiState.currentTool === ToolType.DELETE && (() => {
        const pontoonToDelete = uiState.grid.getPontoonAt(uiState.hoveredCell);
        
        if (!pontoonToDelete) return null; // No pontoon to highlight
        
        const config = getPontoonTypeConfig(pontoonToDelete.type);
        if (!config) return null;
        
        let x = (pontoonToDelete.position.x - (uiState.grid.dimensions.width - 1) / 2) * 0.5;
        const y = pontoonToDelete.position.y * 0.4;
        let z = (pontoonToDelete.position.z - (uiState.grid.dimensions.height - 1) / 2) * 0.5;
        
        // Offset double pontoons to center them properly
        if (pontoonToDelete.type === PontoonType.DOUBLE) {
          if (pontoonToDelete.rotation === Rotation.NORTH || pontoonToDelete.rotation === Rotation.SOUTH) {
            // Double pontoon extends in X direction, offset by half a cell
            x += 0.25;
          } else {
            // Double pontoon extends in Z direction, offset by half a cell
            z += 0.25;
          }
        }
        
        // Use original dimensions - rotation will handle the orientation
        const width = config.dimensions.widthMM / 1000 + 0.02; // Slightly larger
        const depth = config.dimensions.depthMM / 1000 + 0.02;
        
        // Calculate rotation angle in radians
        const rotationY = (pontoonToDelete.rotation * Math.PI) / 180;
        
        return (
          <mesh position={[x, y + 0.01, z]} rotation={[0, rotationY, 0]}> {/* Slightly above pontoon */}
            <boxGeometry args={[width, 0.42, depth]} />
            <meshStandardMaterial 
              color="#ff4444" 
              transparent={true}
              opacity={0.6}
              emissive="#ff0000"
              emissiveIntensity={0.2}
            />
          </mesh>
        );
      })()}
      
      {/* Multi-Drop Preview - Show preview pontoons during drag */}
      {uiState.isDragging && uiState.currentTool === ToolType.MULTI_DROP && uiState.dragPreviewPositions.map((position, index) => {
        const config = getPontoonTypeConfig(uiState.currentPontoonType);
        const colorConfig = getPontoonColorConfig(uiState.currentPontoonColor);
        const canPlace = uiState.grid.canPlacePontoon(position, uiState.currentPontoonType);
        
        if (!config || !colorConfig) return null;
        
        let x = (position.x - (uiState.grid.dimensions.width - 1) / 2) * 0.5;
        const y = position.y * 0.4;
        let z = (position.z - (uiState.grid.dimensions.height - 1) / 2) * 0.5;
        
        // Offset double pontoons to center them properly
        if (uiState.currentPontoonType === PontoonType.DOUBLE) {
          if (uiState.currentRotation === Rotation.NORTH || uiState.currentRotation === Rotation.SOUTH) {
            x += 0.25;
          } else {
            z += 0.25;
          }
        }
        
        const width = config.dimensions.widthMM / 1000;
        const depth = config.dimensions.depthMM / 1000;
        const rotationY = (uiState.currentRotation * Math.PI) / 180;
        
        return (
          <mesh key={`preview-${index}`} position={[x, y, z]} rotation={[0, rotationY, 0]}>
            <boxGeometry args={[width, 0.4, depth]} />
            <meshStandardMaterial 
              color={canPlace ? colorConfig.hex : '#ff0000'} 
              transparent={true}
              opacity={0.6}
            />
          </mesh>
        );
      })}
      
      {/* Drag Selection Box for Multi-Drop and Select tools */}
      {uiState.isDragging && uiState.dragStart && uiState.dragEnd && (
        <group>
          {/* Selection rectangle outline */}
          <lineSegments>
            <edgesGeometry args={[
              new THREE.BoxGeometry(
                Math.abs(uiState.dragEnd.x - uiState.dragStart.x) * 0.5 + 0.5,
                0.1,
                Math.abs(uiState.dragEnd.z - uiState.dragStart.z) * 0.5 + 0.5
              )
            ]} />
            <lineBasicMaterial color="#4A90FF" opacity={0.8} transparent />
          </lineSegments>
          {/* Selection rectangle plane */}
          <mesh position={[
            ((uiState.dragStart.x + uiState.dragEnd.x) / 2 - (uiState.grid.dimensions.width - 1) / 2) * 0.5,
            uiState.currentLevel * 0.4 + 0.01,
            ((uiState.dragStart.z + uiState.dragEnd.z) / 2 - (uiState.grid.dimensions.height - 1) / 2) * 0.5
          ]}>
            <planeGeometry args={[
              Math.abs(uiState.dragEnd.x - uiState.dragStart.x) * 0.5 + 0.5,
              Math.abs(uiState.dragEnd.z - uiState.dragStart.z) * 0.5 + 0.5
            ]} />
            <meshStandardMaterial 
              color="#4A90FF" 
              transparent 
              opacity={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
      
      {/* Simple grid helper */}
      <gridHelper args={[25, 50]} position={[0, 0, 0]} />
    </>
  );
}