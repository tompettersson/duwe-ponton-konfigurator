/**
 * SelectionBox - HTML-based Drag Selection Visualization
 * 
 * Simple drag selection box using mouse coordinates
 * No dependency on R3F - purely HTML-based overlay
 */

'use client';

import { useConfiguratorStore } from '../../store/configuratorStore';

export function SelectionBox() {
  const { dragStartMouse, dragEndMouse, isDragging } = useConfiguratorStore();

  // Don't render if not dragging or no coordinates
  if (!isDragging || !dragStartMouse || !dragEndMouse) {
    return null;
  }

  // Find canvas position to offset coordinates correctly
  const canvas = document.querySelector('canvas');
  if (!canvas) return null;
  
  const canvasRect = canvas.getBoundingClientRect();

  // Calculate selection box dimensions from mouse coordinates
  const left = Math.min(dragStartMouse.x, dragEndMouse.x);
  const top = Math.min(dragStartMouse.y, dragEndMouse.y);
  const width = Math.abs(dragEndMouse.x - dragStartMouse.x);
  const height = Math.abs(dragEndMouse.y - dragStartMouse.y);

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        left: canvasRect.left + left,
        top: canvasRect.top + top,
        width,
        height,
        border: '2px dashed #f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        borderRadius: '4px',
      }}
    >
      {/* Optional: Show selection info */}
      <div 
        className="absolute -top-8 left-0 text-xs bg-orange-500 text-white px-2 py-1 rounded whitespace-nowrap"
        style={{ fontSize: '11px' }}
      >
        Multi-Drop Bereich ({width.toFixed(0)}x{height.toFixed(0)})
      </div>
    </div>
  );
}