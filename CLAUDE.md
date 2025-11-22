# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- `npm run dev` - Start the development server with Turbopack
- `npm run build` - Build the application for production  
- `npm run lint` - Run ESLint to check code quality
- `npm start` - Start the production server

**WICHTIGE REGEL**: Claude startet NIEMALS automatisch den Development Server. Immer den User bitten, `npm run dev` selbst zu starten.

## Project Overview - Pontoon Configurator 3D

**Mission**: Professional 3D pontoon configurator for real-world manufacturing with mathematical precision and production-quality reliability.

**Current Status**: Legacy implementation removed. The application at `/` and `/test-new-architecture` now both run the domain-driven architecture powered by `RenderingEngine`.

## New Architecture Implementation (CURRENT WORK)

**Location**: `/` (main entry) and `/test-new-architecture` (test harness)

**✅ COMPLETED FEATURES:**
- ✅ **Place Tool**: Precise pontoon placement with coordinate validation
- ✅ **Delete Tool**: Reliable pontoon removal with visual feedback  
- ✅ **3D Navigation**: OrbitControls for smooth camera movement
- ✅ **Hover Previews**: Tool-specific visual feedback (semi-transparent preview for place, red highlight for delete)
- ✅ **Professional UI**: German localization, disabled tools clearly marked
- ✅ **Multi-Level Support**: Levels 0-2 with proper validation
- ✅ **Coordinate Precision**: Hover position = click position (Single Source of Truth)
- ✅ **Error Handling**: Graceful failures with user feedback

**🔧 TECHNICAL FIXES COMPLETED:**
- ✅ **Rendering Engine**: RenderingEngine restored as primary path; legacy fallback removed
- ✅ **Phantom Pontoon**: Removed via proper bounds checking and validation
- ✅ **Missing Methods**: Added `removePontoonAt()` to Grid domain class
- ✅ **Coordinate System**: Unified 3D raycasting for precise click/hover matching

**📁 NEW ARCHITECTURE FILES:**
- `app/components/NewPontoonConfigurator.tsx` - Main application component
- `app/lib/domain/` - Domain services (Grid, Pontoon, validators)
- `app/lib/ui/` - RenderingEngine + interaction scaffolding
- `tests/` - Playwright specs targeting the new architecture only

## Domain-Driven Design Architecture

**Core Principle**: Immutable operations with pure functions for reliable testing and production use.

**Domain Layer** (`app/lib/domain/`):
- `Grid.ts` - Aggregate root for all pontoon operations
- `Pontoon.ts` - Pontoon entity with position, type, color, rotation
- `GridPosition.ts` - Value object for 3D coordinates
- `PontoonTypes.ts` - Type definitions and configurations
- `PlacementValidator.ts` - Business logic for placement rules

**UI Layer** (`app/lib/ui/`):
- `InteractionController.ts` - Mouse/touch input handling (not yet wired into UI)
- `RenderingEngine.ts` - Active Three.js renderer for grid, pontoons, hover
- `ToolSystem.ts` - Tool management (future integration)

**Key Design Patterns**:
- **Immutable State**: All operations return new instances
- **Single Source of Truth**: One coordinate system throughout
- **Error-First Design**: All operations validate before execution

## 🚧 PENDING TASKS - Next Development Session

**Priority 1 - Remaining Tools:**
- 🔲 **Select Tool**: Multi-pontoon selection with click/drag
- 🔲 **Rotate Tool**: 90° pontoon rotation (especially for double pontoons)
- 🔲 **Move Tool**: Drag pontoons to new positions

**Priority 2 - Advanced Features:**
- 🔲 **Multi-Level UI**: Clear level indicators and validation feedback
- 🔲 **Undo/Redo System**: History management for all operations
- 🔲 **Export Functionality**: Generate manufacturing data
- 🔲 **3D Model Integration**: Replace boxes with real OBJ pontoon models

**Priority 3 - Production Readiness:**
- 🔲 **Performance Optimization**: Large grid handling (>50x50)
- 🔲 **Mobile Support**: Touch gestures and responsive UI
- 🔲 **Error Recovery**: Robust error handling and user guidance

## 3D Models Available

**Customer Models** (`public/3d/`):
- `fc/Ponton.obj` (4.7MB) + `Ponton.mtl` - Main pontoon model
- `neu/ponton.obj` (4.7MB) - Alternative version
- **OBJ format recommended** - Perfect for Three.js, text-based, widely compatible
- **TODO**: Need single pontoon model from customer

## Core Mathematical System

**Grid Mathematics** (Domain Layer):
- 0.5m grid spacing (500mm) - exact single pontoon size
- Converts between grid coordinates and world positions with millimeter precision
- All internal calculations in millimeters, display in meters

**Critical Constants**:
```typescript
DOMAIN_CONSTANTS = {
  CELL_SIZE_MM: 500,        // 0.5m single pontoon size
  PONTOON_HEIGHT_MM: 400,   // 0.4m standard height
  PRECISION_FACTOR: 1000,   // Convert meters to millimeters
  DEFAULT_GRID_SIZE: 50,    // 50x50 default grid
  DEFAULT_LEVELS: 3         // Levels 0, 1, 2
}
```

**Pontoon Types & Colors**:
- Single: 0.5m x 0.4m x 0.5m (1 grid cell)
- Double: 1.0m x 0.4m x 0.5m (2 grid cells width)
- 4 colors: Blue #6183c2, Black #111111, Grey #e3e4e5, Yellow #f7e295

**Multi-Level System**:
- Level 0 (water surface): Y=0, any placement allowed
- Level 1: Y=1, requires Level 0 support underneath
- Level 2: Y=2, requires both Level 0 AND Level 1 support
- Real-time validation through `PlacementValidator.hasSupport()`

## Debug Panel for Testing

**Machine-Readable Outputs** (`NewPontoonConfigurator.tsx:637-657`):
- Real-time coordinates: "Hover: (25, 0, 6)"
- Grid cell validation: "Grid-Cell-Can-Place: ✅/❌"
- Occupancy status: "Pontoon-Here: YES/NO"
- Click results: "Last-Click: SUCCESS/FAILED"
- Active tool: "Tool: place/delete"
- Current level: "Level: 0/1/2"

**Enables 95% automated testing** via Playwright reading debug text instead of interpreting 3D visuals.

## Development Guidelines

**For New Claude Sessions:**
- Work primarily in `/test-new-architecture` route
- Use Domain-Driven Design patterns established in `app/lib/domain/`
- Maintain immutable operations and pure functions
- Test with Playwright using debug panel data
- **CRITICAL**: Never break Single Source of Truth (hover = click coordinates)
- Mathematical precision is non-negotiable - millimeter accuracy required

**Performance Requirements:**
- Support 50x50 grids (2500 cells) minimum
- Real-time hover feedback (<16ms response)
- Smooth 3D navigation with OrbitControls

**Testing Strategy:**
- Unit tests for domain logic (Grid, Pontoon validation)
- Playwright E2E tests using debug panel text parsing
- Visual regression testing for 3D rendering
- Error case testing (invalid placements, edge cases)
