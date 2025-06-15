/**
 * Toolbar - Minimal Tool Selection for Mathematical Precision Focus
 * 
 * Clean interface with logo and essential pontoon configurator tools
 */

'use client';

import Image from 'next/image';
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
  EyeOff,
  Square
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
    setPontoonType,
    currentPontoonColor,
    setPontoonColor
  } = useConfiguratorStore();

  // Get individual stats to avoid creating new objects on every render
  const pontoonCount = useConfiguratorStore((state) => state.pontoons.size);
  const selectedCount = useConfiguratorStore((state) => state.selectedIds.size);
  const occupiedCells = useConfiguratorStore((state) => state.spatialIndex.getOccupiedCellCount());

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Auswählen', shortcut: '1' },
    { id: 'place', icon: Plus, label: 'Platzieren', shortcut: '2' },
    { id: 'delete', icon: Trash2, label: 'Löschen', shortcut: '3' },
    { id: 'rotate', icon: RotateCw, label: 'Drehen', shortcut: '4' },
    { id: 'multi-drop', icon: Square, label: 'Multi-Drop', shortcut: '5' },
  ] as const;

  const pontoonTypes = [
    { id: 'single', label: 'Einzel', icon: '■' },
    { id: 'double', label: 'Doppel', icon: '■■' },
  ] as const;

  const pontoonColors = [
    { id: 'blue', label: 'Blau', color: '#6183c2' },
    { id: 'black', label: 'Schwarz', color: '#111111' },
    { id: 'gray', label: 'Grau', color: '#e3e4e5' },
    { id: 'yellow', label: 'Gelb', color: '#f7e295' },
  ] as const;

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
          {tools.slice(0, 4).map((tool) => (
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
        {/* Multi-Drop Tool - Full Width */}
        <button
          onClick={() => {
            // FIX: Use atomic tool configuration update instead of separate calls
            useConfiguratorStore.getState().setToolConfiguration({
              tool: 'multi-drop',
              pontoonType: 'double',
              viewMode: '2d'
            });
          }}
          className={`p-2 rounded transition-colors text-sm flex items-center gap-2 ${
            selectedTool === 'multi-drop'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          title="Multi-Drop (5) - Auto Doppel + 2D Ansicht"
        >
          <Square size={16} />
          <span className="text-xs">Multi-Drop</span>
        </button>
      </div>

      {/* Pontoon Type Selection */}
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold text-gray-600 mb-1">Typ</div>
        <div className="grid grid-cols-2 gap-1">
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
              onClick={() => setPontoonColor(color.id as any)}
              className={`p-2 rounded transition-colors text-sm flex items-center gap-2 ${
                currentPontoonColor === color.id
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

      {/* History Controls */}
      <div className="flex gap-1">
        <button
          onClick={undo}
          className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex-1"
          title="Rückgängig (Strg+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex-1"
          title="Wiederholen (Strg+Umschalt+Z)"
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
          title="Raster umschalten (G)"
        >
          {isGridVisible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <button
          onClick={clearGrid}
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
          <span className="font-mono">{pontoonCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Ausgewählt:</span>
          <span className="font-mono">{selectedCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Belegt:</span>
          <span className="font-mono">{occupiedCells}</span>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <div className="h-px bg-gray-300" />
          <div className="text-xs text-gray-500 space-y-1">
            <div className="font-semibold">Shortcuts:</div>
            <div>1-4: Werkzeuge</div>
            <div>Tab: 2D/3D</div>
            <div>G: Raster</div>
            <div>Entf: Löschen</div>
            <div>Strg+A: Alle auswählen</div>
            <div>Esc: Auswahl aufheben</div>
          </div>
        </>
      )}
    </div>
  );
}