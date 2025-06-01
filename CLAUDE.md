# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- `npm run dev` - Start the development server with Turbopack
- `npm run build` - Build the application for production  
- `npm run lint` - Run ESLint to check code quality
- `npm start` - Start the production server

## High-Level Architecture

This is a 3D pontoon configurator built with Next.js 15 (App Router), React 19, and Three.js/React Three Fiber. The application enables users to design modular pontoon platforms using mathematical precision and efficient state management for real-world manufacturing.

### Key Components Structure

The application uses a mathematically-precise component architecture:

- **App.tsx** - Simplified main application component that orchestrates the configurator
- **PontoonConfigurator.tsx** - Main 3D configurator component with Canvas setup and UI overlay
- **GridSystem.tsx** - Mathematical precision grid visualization with 0.5m spacing
- **PontoonManager.tsx** - Efficient pontoon rendering manager for all instances
- **InteractionManager.tsx** - Precise mouse/touch interaction with raycasting
- **CameraController.tsx** - View mode management (2D/3D camera positions)
- **Pontoon.tsx** - Individual pontoon component with exact positioning
- **Toolbar.tsx** - Tool selection with 4-color pontoon picker and German UI

### State Management

**Zustand Store** (`app/store/configuratorStore.ts`) with mathematical precision:
- **Grid mathematics**: SpatialHashGrid, GridMathematics, CollisionDetection integration
- **Pontoon management**: Map-based storage with Set for selections
- **Tool state**: Current tool, pontoon type/color, view mode
- **History system**: Undo/redo with action tracking
- **Validation**: Collision detection and placement validation
- **Performance**: Spatial indexing for optimal rendering

### 3D Rendering Approach - Mathematical Precision ✨

**CURRENT SYSTEM (2025-01-06): Mathematical precision with simple geometry**

- **Single Pontoons**: 0.5m x 0.4m x 0.5m box geometry with exact positioning
- **Double Pontoons**: 1.0m x 0.4m x 0.5m box geometry (2x single width)
- **Mathematical Positioning**: GridMathematics system converts grid to world coordinates
- **Spatial Indexing**: SpatialHashGrid for efficient collision detection and rendering
- **Color System**: 4 pontoon colors (Blue #6183c2, Black #111111, Grey #e3e4e5, Yellow #f7e295)
- **Preview System**: Real pontoon preview with transparency on hover

### Grid System - Mathematical Precision

**Real-world accuracy with mathematical foundations:**
- **Grid spacing**: 0.5m (500mm) - exact single pontoon size
- **Grid mathematics**: GridMathematics class for precise coordinate conversion
- **Spatial indexing**: SpatialHashGrid for O(1) collision detection
- **Ground level only**: Simplified to Y=0 level for minimal implementation
- **Real coordinates**: All positions in millimeters internally, meters for display

### Recent Major Updates (2025-01-06)

✅ **Mathematical Precision Implementation:**
- Complete architectural refactor from old App.jsx to modern TypeScript structure
- Implemented SpatialHashGrid for O(1) collision detection and spatial queries
- GridMathematics system for exact coordinate conversion with millimeter precision
- CollisionDetection system for placement validation and connectivity checks

✅ **Modern Component Architecture:**
- Migrated to TypeScript with proper type definitions
- Modular component structure with clear separation of concerns
- Zustand store with Immer for immutable state management
- Debug system with development-only overlays

✅ **Performance Optimizations:**
- Map/Set based storage for efficient pontoon management
- Spatial indexing eliminates O(n) searches for large grids
- Test pontoons distributed across 50x50 grid to verify rendering performance
- Layer-based raycasting for precise interaction management

✅ **Developer Experience:**
- Comprehensive debug panel with real-time statistics
- Keyboard shortcuts for tool switching and operations
- History system with undo/redo functionality
- Mathematical validation throughout the stack

### Current State & Next Priorities

**Current Status (2025-01-06):**
- ✅ Mathematical precision architecture complete with TypeScript
- ✅ SpatialHashGrid system providing O(1) performance for large grids
- ✅ GridMathematics and CollisionDetection systems working correctly  
- ✅ 4-color pontoon system with simple box geometry
- ✅ Real-world dimensions (0.5m grid spacing) ready for cost calculations
- ✅ Debug system and developer tools implemented

**Immediate Next Steps:**

1. **User Interface Enhancements**
   - Material list panel with pontoon counts by color
   - JSON export/import for projects with real-world dimensions
   - Clear grid confirmation dialog
   - Enhanced toolbar with tool descriptions

2. **Advanced Functionality**
   - Complete rotation system for pontoons
   - Copy/paste and duplication operations
   - Multi-level support (if needed beyond ground level)
   - Advanced selection tools (box select, lasso)

3. **3D Model Integration** (Future)
   - Integrate real CAD models from /public/3d/ folder
   - Implement connector system with automatic placement
   - Advanced rendering optimizations

4. **Production Features**
   - Cost calculation system based on real dimensions
   - PDF export for material lists and assembly instructions
   - Project persistence and cloud storage

### Technical Documentation

**Mathematical System Architecture:**
- **GridMathematics**: Converts between grid coordinates and world positions
- **SpatialHashGrid**: O(1) spatial queries with configurable cell size (500mm)
- **CollisionDetection**: Validates pontoon placement and connectivity
- **Precision**: All internal calculations in millimeters, display in meters

**Critical Constants:**
```typescript
GRID_CONSTANTS = {
  CELL_SIZE_MM: 500,        // 0.5m single pontoon size
  PONTOON_HEIGHT_MM: 400,   // 0.4m standard height
  GRID_SIZE: 50,            // 50x50 default grid
  PRECISION_FACTOR: 1000,   // Convert meters to millimeters
  EPSILON: 0.001,           // Floating point comparisons
}
```

**Current Implementation Notes:**
- Simple box geometry provides mathematical accuracy without complexity
- Spatial indexing enables 50x50 grids (2500 cells) with optimal performance
- Type system ensures coordinate consistency throughout application
- Debug system provides real-time validation of mathematical operations

### Future Architecture

**Phase 1 - Enhanced User Experience:**
- Complete UI/UX implementation with material lists and project management
- Advanced selection and editing tools
- Export/import functionality for project persistence

**Phase 2 - 3D Model Integration:**
- Real CAD model integration from /public/3d/ assets
- Connector system with automatic placement between pontoons
- Advanced rendering optimizations for large platforms

**Phase 3 - Manufacturing Integration:**
- Cost calculation system based on real material dimensions
- PDF export for assembly instructions and material lists
- Direct CAD export capabilities for manufacturing

### Development Notes

**For Future Developers:**
- Mathematical precision is the foundation - maintain millimeter accuracy
- Spatial indexing enables large grids - don't break the performance model
- Type safety is enforced throughout - follow the established patterns
- Debug system provides validation - use it to verify mathematical operations