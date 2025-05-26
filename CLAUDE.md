# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- `npm run dev` - Start the development server with Turbopack
- `npm run build` - Build the application for production  
- `npm run lint` - Run ESLint to check code quality
- `npm start` - Start the production server

## High-Level Architecture

This is a 3D pontoon configurator built with Next.js 15 (App Router), React 19, and Three.js/React Three Fiber. The application enables users to design modular pontoon platforms using real 3D models with precise connection hole alignment for real-world manufacturing.

### Key Components Structure

The application uses a modular component architecture:

- **App.jsx** - Main application component that orchestrates the entire configurator
- **PontoonScene.jsx** - Manages 3D scene state and element management logic
- **Scene.jsx** - Three.js canvas setup with camera controls and mixed rendering
- **SimpleGridSystem.jsx** - Real-world grid system with 0.5m spacing and crosshair markers
- **PontoonInstances.jsx** - Instanced rendering for single pontoons (blue boxes)
- **PontoonModels.jsx** - Real 3D model rendering for double pontoons with precise alignment
- **WaterPlane.jsx** - Water visualization with animated normal maps
- **Toolbar.jsx** - Tool selection with 4-color pontoon picker and German UI

### State Management

**Zustand Store** (`app/store/useStore.js`) manages all application state:
- **Grid state**: Elements with colors, real-world positions, support-based validation
- **Tool state**: Current tool, rotation, selected pontoon color
- **UI state**: View mode (2D/3D), panels, selections
- **Project metadata**: Name, timestamps for cost calculations
- **LocalStorage persistence**: Auto-save/load functionality
- **Color tracking**: Each pontoon stores its color for material lists

### 3D Rendering Approach - Mixed System ✨

**MAJOR UPDATE (2025-05-26): Implemented mixed rendering with real 3D models**

- **Single Pontoons**: Blue boxes (0.5m x 0.4m x 0.5m) via PontoonInstances
- **Double Pontoons**: Real 3D models (1.096m x 0.4m x 0.5m) via PontoonModels
- **3D Model Integration**: Uses fc/Ponton.obj with material files
- **Precise Scaling**: 1.096m target size with automatic bounding box calculation
- **Perfect Alignment**: +0.24 positioning offset for connection hole alignment
- **Color System**: 4 pontoon colors (Blue #5578B7, Black #111111, Grey #DFE0E1, Yellow #F6DE91)

### Grid System - Real-World Dimensions

**Completely overhauled for real-world accuracy:**
- **Grid spacing**: 0.5m (500mm) - matches single pontoon size
- **Grid cells**: Visual 0.5m x 0.5m squares with crosshair markers
- **Connection alignment**: Crosshairs mark exact positions where pontoon holes connect
- **Multi-level support**: Levels -1 to 2 with structural support validation
- **Real coordinates**: All positions in meters for cost/material calculations

### Recent Major Updates (2025-05-26)

✅ **3D Model Integration Completed:**
- Successfully integrated real CAD models (fc/Ponton.obj + materials)
- Solved model centering issues (off-center origin: -6.87, 14.75, -7.39)
- Achieved precise scaling: 1.096m pontoons align connection holes with crosshairs
- Implemented mixed rendering: singles=boxes, doubles=3D models

✅ **Real-World Grid System:**
- Migrated from arbitrary units to 0.5m real-world spacing
- Fixed grid cell visual size to match logical spacing
- Added crosshair markers at intersection points for connection visualization
- Implemented support-based building logic (upper levels need lower support)

✅ **User Experience Improvements:**
- German UI translation with toast notifications
- 4-color pontoon system with toolbar color picker
- Fixed hover preview alignment (exactly matches placement)
- Eliminated transparency confusion (other levels show as opaque gray)

✅ **Technical Challenges Solved:**
- **Model positioning**: Discovered and compensated for off-center model origin
- **Scale calculation**: Automatic bounding box measurement and precise scaling
- **Grid alignment**: Fixed coordinate system inconsistencies
- **Performance**: Mixed rendering reduces complexity while maintaining detail

### Current State & Next Priorities

**Current Status (2025-05-26):**
- ✅ Real 3D model integration working with precise alignment
- ✅ Mixed rendering system stable (singles=boxes, doubles=3D models)  
- ✅ 4-color system implemented with German UI
- ✅ Real-world dimensions (0.5m grid spacing) for cost calculations
- ✅ Connection holes align with crosshairs (ready for connector system)

**Immediate Next Steps:**

1. **3D Model Optimization**
   - Find or create dedicated single pontoon model (currently using fc/Einzel-Scheibe.obj)
   - Test other models in /public/3d/ folder for single pontoons
   - Consider mathematical positioning approach instead of trial-and-error offsets

2. **Core Functionality**
   - Material list panel with pontoon counts by color
   - JSON export/import for projects with real-world dimensions
   - Clear grid confirmation dialog
   - Keyboard shortcuts for tool switching

3. **Connector System Foundation**
   - Add connector elements from /public/3d/fc/ folder (Verbinder.obj, etc.)
   - Implement automatic connector placement between adjacent pontoons
   - Validate connection compatibility between different pontoon colors

4. **User Experience**
   - Undo/Redo functionality
   - Project naming and metadata
   - Performance optimization for large platforms

### Technical Documentation

**3D Model Details:**
- **Double Pontoon**: fc/Ponton.obj (1107.59 x 405.00 x 607.59 mm)
- **Scaling Formula**: targetSize(1.096m) / originalSize(1107.59mm) = scale factor
- **Position Compensation**: +0.24 in X-axis to align connection holes
- **Model Origin Offset**: (-6.87, 14.75, -7.39) must be compensated

**Critical Constants:**
```javascript
GRID_SPACING = 0.5; // meters (500mm)
PONTOON_SCALE = 1.096; // meters target size  
POSITION_OFFSET_X = 0.24; // meters alignment adjustment
MODEL_OFFSET = {x: 6.87, y: -14.75, z: 7.39}; // model origin compensation
```

**Known Issues & Workarounds:**
- Model positioning uses trial-and-error offsets (should be mathematical)
- Single pontoons use placeholder boxes (need real 3D model)
- Connection hole alignment achieved but not validated with real connectors

### Future Architecture

**Phase 1 - Enhanced 3D Models:**
- Complete 3D model integration for all pontoon types
- Connector system with automatic placement
- Material cost calculations with real dimensions

**Phase 2 - Backend Integration:**
- Symfony API for project persistence
- User authentication and project management  
- PDF export for material lists and assembly instructions

**Phase 3 - Manufacturing Integration:**
- Direct CAD export capabilities
- Assembly instruction generation
- Real-world validation with physical pontoons

### Development Notes

**For Future Developers:**
- All coordinates are in meters for real-world compatibility
- Model scaling is automatic but positioning needs manual adjustment
- Grid crosshairs indicate exact connection points for future connector system
- State management ready for cost calculations and material ordering