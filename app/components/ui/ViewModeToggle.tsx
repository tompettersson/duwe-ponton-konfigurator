/**
 * ViewModeToggle - 2D/3D View Mode Switcher
 * 
 * Clean toggle between orthographic 2D and perspective 3D views
 */

'use client';

import { useConfiguratorStore } from '../../store/configuratorStore';
import { Maximize2, Box } from 'lucide-react';

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useConfiguratorStore();

  return (
    <div className="flex gap-1 bg-white rounded-lg shadow-lg p-1">
      <button
        onClick={() => setViewMode('2d')}
        className={`p-3 rounded transition-colors ${
          viewMode === '2d'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
        title="2D View (Top-Down)"
      >
        <Maximize2 size={20} />
      </button>
      
      <button
        onClick={() => setViewMode('3d')}
        className={`p-3 rounded transition-colors ${
          viewMode === '3d'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
        title="3D View (Perspective)"
      >
        <Box size={20} />
      </button>
    </div>
  );
}