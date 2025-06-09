/**
 * PontoonConfigurator - Main 3D Configurator Component
 * 
 * Orchestrates the entire 3D pontoon configuration interface
 * Minimal implementation focused on mathematical precision
 */

'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { GridSystem } from './GridSystem';
import { CameraController } from './CameraController';
import { InteractionManager } from './InteractionManager';
import { PontoonManager } from './PontoonManager';
import { useConfiguratorStore } from '../../store/configuratorStore';
import { useDebugStore } from '../../store/debugStore';
import { Toolbar } from '../ui/Toolbar';
import { ViewModeToggle } from '../ui/ViewModeToggle';
import { LevelSelector } from '../ui/LevelSelector';
import { SelectionBox } from '../ui/SelectionBox';
import { COLORS, CAMERA_POSITIONS } from '../../lib/constants';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function PontoonConfigurator() {
  const viewMode = useConfiguratorStore((state) => state.viewMode);
  const isGridVisible = useConfiguratorStore((state) => state.isGridVisible);
  const selectedTool = useConfiguratorStore((state) => state.selectedTool);

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
        <CameraController mode={viewMode} disableControls={selectedTool === 'multi-drop'} />
        {process.env.NODE_ENV === 'development' && <CameraDebugTracker />}
        
      </Canvas>

      {/* Selection Box Overlay - Outside Canvas */}
      <SelectionBox />

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-10">
        <Toolbar />
      </div>

      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <ViewModeToggle />
        <LevelSelector />
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
  
  // Multi-Drop Debug Info
  const isDragging = useConfiguratorStore((state) => state.isDragging);
  const dragStart = useConfiguratorStore((state) => state.dragStart);
  const dragEnd = useConfiguratorStore((state) => state.dragEnd);
  const previewPositions = useConfiguratorStore((state) => state.previewPositions);
  const gridMath = useConfiguratorStore((state) => state.gridMath);
  const currentPontoonType = useConfiguratorStore((state) => state.currentPontoonType);
  
  // Debug information
  const { intersectCount, raycastCoords, lastClickResult, cameraDebugInfo } = useDebugStore();

  // Calculate affected grid cells for display
  const getGridVisualization = () => {
    if (!isDragging || !dragStart || !dragEnd) return null;
    
    const positions = gridMath.getGridPositionsInArea(dragStart, dragEnd);
    
    // Apply same filtering as the actual placement
    let filteredPositions = positions;
    if (currentPontoonType === 'double') {
      const minX = Math.min(dragStart.x, dragEnd.x);
      filteredPositions = positions.filter(pos => {
        const relativeX = pos.x - minX;
        return relativeX % 2 === 0;
      });
    }
    
    // Group by Z (rows) for visualization
    const rows = new Map<number, Array<{x: number, y: number, z: number}>>();
    filteredPositions.forEach(pos => {
      if (!rows.has(pos.z)) rows.set(pos.z, []);
      rows.get(pos.z)!.push(pos);
    });
    
    // Sort rows by Z coordinate
    const sortedRows = Array.from(rows.entries()).sort((a, b) => a[0] - b[0]);
    
    return {
      totalAll: positions.length,
      totalFiltered: filteredPositions.length,
      bounds: {
        minX: Math.min(dragStart.x, dragEnd.x),
        maxX: Math.max(dragStart.x, dragEnd.x),
        minZ: Math.min(dragStart.z, dragEnd.z),
        maxZ: Math.max(dragStart.z, dragEnd.z)
      },
      rows: sortedRows
    };
  };

  const gridViz = getGridVisualization();

  return (
    <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded text-sm font-mono max-w-md max-h-96 overflow-y-auto">
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
        <div className={
          lastClickResult === 'SUCCESS' ? 'text-green-400' : 
          lastClickResult === 'WRONG_LEVEL' ? 'text-yellow-400' : 
          'text-red-400'
        }>
          Click: {lastClickResult}
        </div>
      )}
      <div className="text-purple-400">Rendering: {pontoonCount > 0 ? 'Active' : 'None'}</div>
      
      {/* Camera Debug Info */}
      {cameraDebugInfo && (
        <div className="mt-2 border-t border-gray-600 pt-2">
          <div className="text-cyan-400 font-bold">Camera Info:</div>
          <div className="text-green-300">
            Pos: ({cameraDebugInfo.position.x.toFixed(1)}, {cameraDebugInfo.position.y.toFixed(1)}, {cameraDebugInfo.position.z.toFixed(1)})
          </div>
          <div className="text-yellow-300">Zoom: {cameraDebugInfo.distance.toFixed(1)}</div>
          <div className="text-orange-300">
            Rotation: {cameraDebugInfo.rotation.azimuth.toFixed(0)}° / {cameraDebugInfo.rotation.polar.toFixed(0)}°
          </div>
        </div>
      )}
      
      {/* Multi-Drop Debug Section */}
      {selectedTool === 'multi-drop' && (
        <div className="mt-2 border-t border-gray-600 pt-2">
          <div className="text-orange-400 font-bold">Multi-Drop Debug:</div>
          <div>Dragging: {isDragging ? 'YES' : 'NO'}</div>
          {dragStart && <div className="text-cyan-400">Start: ({dragStart.x}, {dragStart.z})</div>}
          {dragEnd && <div className="text-cyan-400">End: ({dragEnd.x}, {dragEnd.z})</div>}
          <div>Type: {currentPontoonType}</div>
          <div>Preview Cells: {previewPositions.size}</div>
          
          {gridViz && (
            <div className="mt-2">
              <div className="text-yellow-400">
                Area: {gridViz.bounds.maxX - gridViz.bounds.minX + 1}x{gridViz.bounds.maxZ - gridViz.bounds.minZ + 1}
              </div>
              <div>Total: {gridViz.totalAll} → Filtered: {gridViz.totalFiltered}</div>
              
              <div className="mt-1 text-xs">
                <div className="text-gray-400">Grid Cells (X,Z):</div>
                {gridViz.rows.map(([z, positions]) => (
                  <div key={z} className="flex items-center gap-1">
                    <span className="text-gray-500 w-6">Z{z}:</span>
                    <span className="text-green-300">
                      {positions.map(pos => `X${pos.x}`).join(' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Camera Debug Tracker - Runs inside Canvas to track camera state
function CameraDebugTracker() {
  const { camera } = useThree();
  const { setCameraDebugInfo } = useDebugStore();

  useFrame(() => {
    // Calculate distance from target (zoom level)
    const distance = camera.position.distanceTo({ x: 0, y: 0, z: 0 } as any);
    
    // Calculate rotation angles in degrees
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(camera.position);
    const azimuth = (spherical.theta * 180) / Math.PI; // Horizontal rotation
    const polar = (spherical.phi * 180) / Math.PI;     // Vertical rotation

    setCameraDebugInfo({
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      },
      distance: distance,
      rotation: {
        azimuth: azimuth,
        polar: polar
      }
    });
  });

  return null;
}