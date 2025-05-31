/**
 * PontoonConfigurator - Main 3D Configurator Component
 * 
 * Orchestrates the entire 3D pontoon configuration interface
 * Minimal implementation focused on mathematical precision
 */

'use client';

import { Canvas } from '@react-three/fiber';
import { GridSystem } from './GridSystem';
import { CameraController } from './CameraController';
import { InteractionManager } from './InteractionManager';
import { PontoonManager } from './PontoonManager';
import { useConfiguratorStore } from '../../store/configuratorStore';
import { useDebugStore } from '../../store/debugStore';
import { Toolbar } from '../ui/Toolbar';
import { ViewModeToggle } from '../ui/ViewModeToggle';
import { COLORS, CAMERA_POSITIONS } from '../../lib/constants';

export function PontoonConfigurator() {
  const viewMode = useConfiguratorStore((state) => state.viewMode);
  const isGridVisible = useConfiguratorStore((state) => state.isGridVisible);

  return (
    <div className="relative w-full h-screen bg-gray-100">
      <Canvas
        camera={{ 
          position: CAMERA_POSITIONS[viewMode.toUpperCase() as keyof typeof CAMERA_POSITIONS].position,
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        shadows={false} // Disabled for performance in minimal implementation
      >
        {/* Background */}
        <color attach="background" args={[COLORS.BACKGROUND]} />
        
        {/* Simple Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 15, 5]}
          intensity={0.8}
          castShadow={false} // Disabled for minimal implementation
        />

        {/* Core 3D Components */}
        {isGridVisible && <GridSystem />}
        <PontoonManager />
        <InteractionManager />
        <CameraController mode={viewMode} />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-10">
        <Toolbar />
      </div>

      <div className="absolute top-4 right-4 z-10">
        <ViewModeToggle />
      </div>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <DebugPanel />
      )}
    </div>
  );
}

function DebugPanel() {
  // Get individual values instead of calling getGridStats() which creates new objects
  const selectedTool = useConfiguratorStore((state) => state.selectedTool);
  const hoveredCell = useConfiguratorStore((state) => state.hoveredCell);
  const pontoonCount = useConfiguratorStore((state) => state.pontoons.size);
  const selectedCount = useConfiguratorStore((state) => state.selectedIds.size);
  const occupiedCells = useConfiguratorStore((state) => state.spatialIndex.getOccupiedCellCount());
  
  // Debug information
  const { intersectCount, raycastCoords, lastClickResult } = useDebugStore();

  return (
    <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded text-sm font-mono">
      <div>Tool: {selectedTool}</div>
      <div>Pontoons: {pontoonCount}</div>
      <div>Selected: {selectedCount}</div>
      <div>Occupied Cells: {occupiedCells}</div>
      {hoveredCell ? (
        <div className="text-green-400">Hover: ({hoveredCell.x}, {hoveredCell.y}, {hoveredCell.z})</div>
      ) : (
        <div className="text-red-400">Hover: none</div>
      )}
      <div className="text-blue-400">Intersects: {intersectCount}</div>
      <div className="text-gray-400">Ray: ({raycastCoords.x.toFixed(2)}, {raycastCoords.y.toFixed(2)})</div>
      {lastClickResult && (
        <div className={lastClickResult === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}>
          Click: {lastClickResult}
        </div>
      )}
    </div>
  );
}