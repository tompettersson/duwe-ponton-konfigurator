import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import { saveToLocalStorage, loadFromLocalStorage } from './localStorage';

const useStore = create(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
      // Grid State
      grid: {
        size: { width: 20, height: 20 },
        elements: [], // Array of { id, position: {x, y, z}, type: 'single'|'double', rotation: 0|90|180|270 }
        showGrid: true,
        currentLevel: 0,
      },

      // Tool State
      tool: {
        current: 'single', // 'single', 'double', 'eraser', 'pan', 'select'
        rotation: 0, // 0, 90, 180, 270
      },

      // UI State
      ui: {
        viewMode: '3d', // '2d' or '3d'
        showMaterialList: false,
        showHelp: false,
        hoveredCell: null,
        selectedElements: [],
      },

      // Project State
      project: {
        name: 'Untitled Project',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },

      // Grid Actions
      addElement: (element) => set((state) => {
        // Check if position is already occupied
        const exists = state.grid.elements.some(
          el => el.position.x === element.position.x && 
               el.position.y === element.position.y && 
               el.position.z === element.position.z
        );
        
        if (!exists) {
          state.grid.elements.push({
            id: `element-${Date.now()}`,
            ...element,
          });
          state.project.modified = new Date().toISOString();
        }
      }),

      removeElement: (id) => set((state) => {
        state.grid.elements = state.grid.elements.filter(el => el.id !== id);
        state.project.modified = new Date().toISOString();
      }),

      removeElementAtPosition: (position) => set((state) => {
        state.grid.elements = state.grid.elements.filter(
          el => !(el.position.x === position.x && 
                 el.position.y === position.y && 
                 el.position.z === position.z)
        );
        state.project.modified = new Date().toISOString();
      }),

      clearGrid: () => set((state) => {
        state.grid.elements = [];
        state.project.modified = new Date().toISOString();
      }),

      setGridSize: (width, height) => set((state) => {
        state.grid.size = { width, height };
        state.project.modified = new Date().toISOString();
      }),

      setCurrentLevel: (level) => set((state) => {
        state.grid.currentLevel = level;
      }),

      // Tool Actions
      setCurrentTool: (tool) => set((state) => {
        state.tool.current = tool;
      }),

      setToolRotation: (rotation) => set((state) => {
        state.tool.rotation = rotation;
      }),

      // UI Actions
      setViewMode: (mode) => set((state) => {
        state.ui.viewMode = mode;
      }),

      toggleMaterialList: () => set((state) => {
        state.ui.showMaterialList = !state.ui.showMaterialList;
      }),

      setHoveredCell: (cell) => set((state) => {
        state.ui.hoveredCell = cell;
      }),

      // Project Actions
      setProjectName: (name) => set((state) => {
        state.project.name = name;
        state.project.modified = new Date().toISOString();
      }),

      // Computed values
      getMaterialCount: () => {
        const elements = get().grid.elements;
        return {
          single: elements.filter(el => el.type === 'single').length,
          double: elements.filter(el => el.type === 'double').length,
          total: elements.length,
        };
      },

      // Export/Import
      exportProject: () => {
        const state = get();
        return {
          project: state.project,
          grid: state.grid,
        };
      },

      importProject: (data) => set((state) => {
        if (data.project) state.project = data.project;
        if (data.grid) state.grid = data.grid;
        state.project.modified = new Date().toISOString();
      }),

      // Initialize from localStorage
      initializeFromStorage: () => {
        const savedState = loadFromLocalStorage();
        if (savedState) {
          set((state) => {
            state.project = savedState.project;
            state.grid = { ...state.grid, ...savedState.grid };
          });
        }
      },
    }))
    ),
    {
      name: 'pontoon-store',
    }
  )
);

// Subscribe to changes and save to localStorage
useStore.subscribe(
  (state) => ({ project: state.project, grid: state.grid }),
  (current) => {
    saveToLocalStorage(current);
  }
);

export default useStore;