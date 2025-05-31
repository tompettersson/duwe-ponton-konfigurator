/**
 * Toolbar - Minimal Tool Selection for Mathematical Precision Focus
 * 
 * Clean interface for essential pontoon configurator tools
 */

'use client';

import { useConfiguratorStore } from '../../store/configuratorStore';
import {
  MousePointer2,
  Plus,
  Trash2,
  RotateCw,
  Undo2,
  Redo2,
  Grid3X3,
  Eye,
  EyeOff
} from 'lucide-react';

export function Toolbar() {
  const { 
    selectedTool, 
    setTool, 
    undo, 
    redo,
    isGridVisible,
    setGridVisible,
    clearGrid,
    currentPontoonType,
    setPontoonType
  } = useConfiguratorStore();

  // Get individual stats to avoid creating new objects on every render
  const pontoonCount = useConfiguratorStore((state) => state.pontoons.size);
  const selectedCount = useConfiguratorStore((state) => state.selectedIds.size);
  const occupiedCells = useConfiguratorStore((state) => state.spatialIndex.getOccupiedCellCount());

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select', shortcut: '1' },
    { id: 'place', icon: Plus, label: 'Place', shortcut: '2' },
    { id: 'delete', icon: Trash2, label: 'Delete', shortcut: '3' },
    { id: 'rotate', icon: RotateCw, label: 'Rotate', shortcut: '4' },
  ] as const;

  const pontoonTypes = [
    { id: 'standard', label: 'Standard', color: '#4a90e2' },
    { id: 'corner', label: 'Corner', color: '#ff6b35' },
    { id: 'special', label: 'Special', color: '#4ecdc4' },
  ] as const;

  return (
    <div className="flex flex-col gap-2 bg-white rounded-lg shadow-lg p-3 min-w-48">
      {/* Tool Selection */}
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold text-gray-600 mb-1">Tools</div>
        <div className="grid grid-cols-2 gap-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setTool(tool.id as any)}
              className={`p-2 rounded transition-colors text-sm flex items-center gap-2 ${
                selectedTool === tool.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title={`${tool.label} (${tool.shortcut})`}
            >
              <tool.icon size={16} />
              <span className="text-xs">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pontoon Type Selection */}
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold text-gray-600 mb-1">Type</div>
        <div className="flex flex-col gap-1">
          {pontoonTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setPontoonType(type.id as any)}
              className={`p-2 rounded transition-colors text-sm flex items-center gap-2 ${
                currentPontoonType === type.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: type.color }}
              />
              <span className="text-xs">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-gray-300" />

      {/* History Controls */}
      <div className="flex gap-1">
        <button
          onClick={undo}
          className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex-1"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex-1"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>
      </div>

      {/* View Controls */}
      <div className="flex gap-1">
        <button
          onClick={() => setGridVisible(!isGridVisible)}
          className={`p-2 rounded transition-colors flex-1 ${
            isGridVisible
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700'
          }`}
          title="Toggle Grid (G)"
        >
          {isGridVisible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <button
          onClick={clearGrid}
          className="p-2 rounded bg-red-100 hover:bg-red-200 text-red-700 transition-colors flex-1"
          title="Clear All"
        >
          <Grid3X3 size={16} />
        </button>
      </div>

      <div className="h-px bg-gray-300" />

      {/* Stats */}
      <div className="text-xs text-gray-600 space-y-1">
        <div className="flex justify-between">
          <span>Pontoons:</span>
          <span className="font-mono">{pontoonCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Selected:</span>
          <span className="font-mono">{selectedCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Occupied:</span>
          <span className="font-mono">{occupiedCells}</span>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <div className="h-px bg-gray-300" />
          <div className="text-xs text-gray-500 space-y-1">
            <div className="font-semibold">Shortcuts:</div>
            <div>1-4: Tools</div>
            <div>Tab: 2D/3D</div>
            <div>G: Grid</div>
            <div>Del: Delete</div>
            <div>Ctrl+A: Select All</div>
            <div>Esc: Clear Selection</div>
          </div>
        </>
      )}
    </div>
  );
}