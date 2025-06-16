# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- `npm run dev` - Start the development server with Turbopack
- `npm run build` - Build the application for production  
- `npm run lint` - Run ESLint to check code quality
- `npm start` - Start the production server

**WICHTIGE REGEL**: Claude startet NIEMALS automatisch den Development Server. Immer den User bitten, `npm run dev` selbst zu starten.

## Playwright Testing with 3D Configurator

**BREAKTHROUGH**: Debug Panel als "Augen" für Playwright Testing

**Implementation**: Enhanced debug panel provides machine-readable 3D state:
- Exact grid coordinates: "Hover: (5, 1, 8)"
- Physical positions: "Hover-World: (2.5m, 0.4m, 4.0m)"  
- Occupancy status: "Pontoon-Here: YES/NO"
- Support validation: "Support-L0: ✅/❌"
- Placement possibility: "Can-Place: YES/NO-OCCUPIED"

**Testing Coverage**: 95% of 3D logic automatically testable via debug text parsing

**Files**: 
- `app/components/configurator/PontoonConfigurator.tsx:155-207` - Enhanced Debug Panel
- `PLAYWRIGHT-TESTING-STRATEGY.md` - Complete implementation guide

## Recent Major Fixes (2025-01-16)

**✅ LEVEL-SWITCHING BUG RESOLVED:**
- **Problem**: Canvas click reset level from 1→0, making multi-level placement impossible
- **Solution**: Multi-layer protection in configuratorStore.ts with stack-trace analysis
- **Files**: 
  - `app/store/configuratorStore.ts:478-500` - Level-reset protection
  - `app/components/configurator/InteractionManager.tsx:240` - State-capture protection
  - `app/components/configurator/PontoonConfigurator.tsx:107` - Fixed missing getPontoonAt import

**✅ MULTI-LEVEL VALIDATION WORKING:**
- Level 1 placement requires Level 0 support ✅
- Level 2 placement requires Level 0+1 support ✅  
- Real-time validation via debug panel ✅

**Result**: Multi-level pontoon stacking (Level 0→1→2) fully functional

## High-Level Architecture

This is a 3D pontoon configurator built with Next.js 15 (App Router), React 19, and Three.js/React Three Fiber. The application enables users to design modular pontoon platforms using mathematical precision and efficient state management for real-world manufacturing.

### Core Mathematical System

**Grid Mathematics** (`app/lib/grid/GridMathematics.ts`):
- 0.5m grid spacing (500mm) - exact single pontoon size
- Converts between grid coordinates and world positions with millimeter precision
- All internal calculations in millimeters, display in meters

**Spatial Indexing** (`app/store/configuratorStore.ts`):
- SpatialHashGrid provides O(1) collision detection for large grids
- Map-based storage with Set for selections for efficient pontoon management
- Supports 50x50 grids (2500 cells) with optimal performance

### Component Architecture

**Main Components**:
- `PontoonConfigurator.tsx` - Main 3D configurator with Canvas setup and UI overlay
- `GridSystem.tsx` - Mathematical precision grid visualization 
- `PontoonManager.tsx` - Efficient pontoon rendering manager for all instances
- `InteractionManager.tsx` - Precise mouse/touch interaction with raycasting
- `CameraController.tsx` - View mode management (2D/3D camera positions)
- `Toolbar.tsx` - Tool selection with 4-color pontoon picker and German UI

### Multi-Level System

**Level Management**:
- Level 0 (ground): Y=0, any placement allowed
- Level 1: Y=1, requires Level 0 support underneath
- Level 2: Y=2, requires both Level 0 AND Level 1 support
- Real-time validation through `CollisionDetection.hasCellSupport()`

**Pontoon Types**:
- Single: 0.5m x 0.4m x 0.5m (1 grid cell)
- Double: 1.0m x 0.4m x 0.5m (2 grid cells width)
- 4 colors: Blue #6183c2, Black #111111, Grey #e3e4e5, Yellow #f7e295

### State Management (Zustand)

**Store Structure** (`app/store/configuratorStore.ts`):
- `pontoons: Map<string, PontoonElement>` - All pontoon instances
- `spatialIndex: SpatialHashGrid` - O(1) collision detection
- `currentLevel: number` - Active placement level (0-2)
- `selectedTool: string` - Current tool (place, select, delete, rotate, multi-drop)
- `hoveredCell: GridPosition` - Real-time hover feedback
- `history: Array` - Undo/redo system

**Critical Constants**:
```typescript
GRID_CONSTANTS = {
  CELL_SIZE_MM: 500,        // 0.5m single pontoon size
  PONTOON_HEIGHT_MM: 400,   // 0.4m standard height
  GRID_SIZE: 50,            // 50x50 default grid
  PRECISION_FACTOR: 1000,   // Convert meters to millimeters
}
```

### 3D Rendering Approach

**Current Implementation**:
- Simple box geometry with exact mathematical positioning
- Single pontoons: 0.5m x 0.4m x 0.5m box geometry
- Double pontoons: 1.0m x 0.4m x 0.5m box geometry  
- Mathematical positioning via GridMathematics coordinate conversion
- Preview system with transparency on hover

### Debug Panel for Testing

**Machine-Readable Outputs** (`PontoonConfigurator.tsx:155-207`):
- Real-time coordinates: "Hover: (5, 1, 8)"
- World positions: "Hover-World: (2.5m, 0.4m, 4.0m)"
- Occupancy: "Pontoon-Here: YES/NO"
- Support validation: "Support-L0: ✅/❌", "Support-L1: ✅/❌"
- Placement validation: "Can-Place: YES/NO-OCCUPIED"
- Level matching: "Hover Y: 1 ✅/❌"

**Enables 95% automated testing** via Playwright reading debug text instead of interpreting 3D visuals.

## Development Notes

**For New Developers:**
- Mathematical precision is the foundation - maintain millimeter accuracy
- Spatial indexing enables large grids - don't break the performance model  
- Type safety is enforced throughout - follow the established patterns
- Debug system provides validation - use it to verify mathematical operations
- **CRITICAL**: Single Source of Truth - Never duplicate data calculations (hover state = click state)

**Current Status**: Multi-level pontoon stacking (Level 0→1→2) fully functional and ready for production features.
