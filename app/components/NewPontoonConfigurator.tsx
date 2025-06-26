/**
 * NewPontoonConfigurator - React Component Integration Example
 * 
 * Shows how to integrate the new architecture with React components
 * Demonstrates clean separation between UI and business logic
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Import new architecture
import { 
  Grid,
  GridPosition,
  PontoonType,
  PontoonColor,
  DOMAIN_CONSTANTS
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

// UI state interface
interface ConfiguratorUIState {
  grid: Grid;
  currentLevel: number;
  currentTool: ToolType;
  currentPontoonType: PontoonType;
  currentPontoonColor: PontoonColor;
  hoveredCell: GridPosition | null;
  selectedPontoonIds: Set<string>;
  isGridVisible: boolean;
  viewMode: '2d' | '3d';
  showPreview: boolean;
  showSelection: boolean;
  showSupport: boolean;
}

// Component props
interface NewPontoonConfiguratorProps {
  initialGridSize?: { width: number; height: number; levels: number };
  onGridChange?: (grid: Grid) => void;
  onError?: (error: string) => void;
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
    hoveredCell: null,
    selectedPontoonIds: new Set(),
    isGridVisible: true,
    viewMode: '3d',
    showPreview: true,
    showSelection: true,
    showSupport: false
  }));

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
  const interactionCallbacks: InteractionCallbacks = useCallback({
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
  }, [onGridChange, onError]);

  // Initialize systems when canvas is ready
  useEffect(() => {
    if (!canvasRef.current) return;

    console.log('🎮 Initializing new architecture systems...');

    // Initialize systems
    const interactionController = new InteractionController(interactionCallbacks);
    const toolSystem = new ToolSystem();
    
    // Store refs
    interactionControllerRef.current = interactionController;
    toolSystemRef.current = toolSystem;

    // Initialize interaction controller with canvas
    interactionController.initialize(canvasRef.current);

    // Activate default tool
    toolSystem.activateTool(uiState.currentTool);

    // Cleanup function
    return () => {
      interactionController.cleanup();
      toolSystem.cleanup();
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Tool shortcuts
      switch (event.key) {
        case '1': handleToolChange(ToolType.PLACE); break;
        case '2': handleToolChange(ToolType.SELECT); break;
        case '3': handleToolChange(ToolType.DELETE); break;
        case '4': handleToolChange(ToolType.ROTATE); break;
        case '5': handleToolChange(ToolType.MULTI_DROP); break;
        case '6': handleToolChange(ToolType.MOVE); break;
        case '7': handleToolChange(ToolType.PAINT); break;
        
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToolChange, handleLevelChange, handlePontoonTypeChange, handleGridToggle, handleViewModeToggle]);

  // Update statistics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        pontoonCount: uiState.grid.getPontoonCount(),
        renderFPS: renderingEngineRef.current?.getStats().lastRenderTime || 0,
        interactionLatency: interactionControllerRef.current?.getStats().averageResponseTime || 0
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [uiState.grid]);

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
        />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-10 space-y-4">
        {/* Tool Panel */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h3 className="text-sm font-semibold mb-2">Tools</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(ToolType).map((tool) => (
              <button
                key={tool}
                onClick={() => handleToolChange(tool)}
                className={`px-3 py-2 text-sm rounded ${
                  uiState.currentTool === tool
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {tool.charAt(0).toUpperCase() + tool.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Level Selector */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h3 className="text-sm font-semibold mb-2">Level</h3>
          <div className="space-y-1">
            {Array.from({ length: uiState.grid.dimensions.levels }, (_, i) => (
              <button
                key={i}
                onClick={() => handleLevelChange(i)}
                className={`w-full px-3 py-2 text-sm rounded ${
                  uiState.currentLevel === i
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Level {i}
              </button>
            ))}
          </div>
        </div>

        {/* Pontoon Settings */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h3 className="text-sm font-semibold mb-2">Pontoon</h3>
          
          {/* Type Selection */}
          <div className="mb-3">
            <label className="text-xs text-gray-600">Type</label>
            <div className="flex gap-2 mt-1">
              {Object.values(PontoonType).map((type) => (
                <button
                  key={type}
                  onClick={() => handlePontoonTypeChange(type)}
                  className={`px-3 py-1 text-xs rounded ${
                    uiState.currentPontoonType === type
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="text-xs text-gray-600">Color</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {Object.values(PontoonColor).map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`px-3 py-1 text-xs rounded border-2 ${
                    uiState.currentPontoonColor === color
                      ? 'border-gray-800'
                      : 'border-gray-300'
                  }`}
                  style={{ 
                    backgroundColor: {
                      [PontoonColor.BLUE]: '#6183c2',
                      [PontoonColor.BLACK]: '#111111',
                      [PontoonColor.GREY]: '#e3e4e5', 
                      [PontoonColor.YELLOW]: '#f7e295'
                    }[color],
                    color: color === PontoonColor.BLACK ? 'white' : 'black'
                  }}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Panel */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h3 className="text-sm font-semibold mb-2">Statistics</h3>
          <div className="space-y-1 text-xs">
            <div>Pontoons: {stats.pontoonCount}</div>
            <div>Selected: {uiState.selectedPontoonIds.size}</div>
            <div>Level: {uiState.currentLevel}</div>
            <div>Tool: {uiState.currentTool}</div>
            {uiState.hoveredCell && (
              <div>Hover: ({uiState.hoveredCell.x}, {uiState.hoveredCell.y}, {uiState.hoveredCell.z})</div>
            )}
          </div>
        </div>
      </div>

      {/* View Controls */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="space-y-2">
            <button
              onClick={handleViewModeToggle}
              className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {uiState.viewMode === '2d' ? '3D View' : '2D View'}
            </button>
            <button
              onClick={handleGridToggle}
              className={`w-full px-3 py-2 text-sm rounded ${
                uiState.isGridVisible
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              {uiState.isGridVisible ? 'Hide Grid' : 'Show Grid'}
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h3 className="text-sm font-semibold mb-2">Shortcuts</h3>
          <div className="text-xs space-y-1">
            <div>1-7: Tools</div>
            <div>Q/W/E: Levels</div>
            <div>S/D: Single/Double</div>
            <div>G: Toggle Grid</div>
            <div>V: Toggle View</div>
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
  onRenderingEngineReady 
}: { 
  uiState: ConfiguratorUIState;
  onRenderingEngineReady: (engine: RenderingEngine) => void;
}) {
  const { scene } = useThree();
  const renderingEngineRef = useRef<RenderingEngine | null>(null);

  // Initialize rendering engine
  useEffect(() => {
    if (!renderingEngineRef.current) {
      const engine = new RenderingEngine(scene, {
        showGrid: uiState.isGridVisible,
        showPreview: uiState.showPreview,
        showSelection: uiState.showSelection,
        showSupport: uiState.showSupport
      });
      
      renderingEngineRef.current = engine;
      onRenderingEngineReady(engine);
      
      console.log('🎨 RenderingEngine initialized');
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

  // Render frame
  useEffect(() => {
    if (!renderingEngineRef.current) return;

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
  });

  return null; // No direct JSX needed, all rendering handled by RenderingEngine
}