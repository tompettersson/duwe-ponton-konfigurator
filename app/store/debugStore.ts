/**
 * Debug Store - Runtime debugging information
 * 
 * Separate store for debugging data to avoid performance issues
 */

import { create } from 'zustand';

interface DebugState {
  intersectCount: number;
  raycastCoords: { x: number; y: number };
  lastClickResult: string | null;
  
  setIntersectCount: (count: number) => void;
  setRaycastCoords: (coords: { x: number; y: number }) => void;
  setLastClickResult: (result: string | null) => void;
}

export const useDebugStore = create<DebugState>((set) => ({
  intersectCount: 0,
  raycastCoords: { x: 0, y: 0 },
  lastClickResult: null,
  
  setIntersectCount: (count) => set({ intersectCount: count }),
  setRaycastCoords: (coords) => set({ raycastCoords: coords }),
  setLastClickResult: (result) => set({ lastClickResult: result }),
}));