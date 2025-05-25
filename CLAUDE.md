# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- `npm run dev` - Start the development server with Turbopack
- `npm run build` - Build the application for production  
- `npm run lint` - Run ESLint to check code quality
- `npm start` - Start the production server

## High-Level Architecture

This is a 3D pontoon configurator built with Next.js 15 (App Router), React 19, and Three.js/React Three Fiber.

### Key Components Structure

The application uses a modular component architecture:

- **App.jsx** - Main application component that orchestrates the entire configurator
- **PontoonScene.jsx** - Manages 3D scene state and element management logic
- **Scene.jsx** - Three.js canvas setup with camera controls and rendering
- **Grid/GridCell/GridElement** - Grid-based placement system for pontoons
- **PontoonInstances.jsx** - Instanced rendering of pontoon elements for performance
- **WaterPlane.jsx** - Water visualization with animated normal maps

### State Management

~~The application uses React hooks for state management:~~
**UPDATE (2025-05-24): Migrated to Zustand for centralized state management**

- **Zustand Store** (`app/store/useStore.js`) manages all application state:
  - Grid state (elements, size, current level)
  - Tool state (current tool, rotation)
  - UI state (view mode, panels, selections)
  - Project metadata (name, timestamps)
- **LocalStorage persistence** automatically saves/loads state
- State is accessible from any component via hooks
- Prepared for future Symfony API integration

### 3D Rendering Approach

- Uses React Three Fiber for declarative 3D scene management
- Implements instanced rendering for pontoons to handle large grids efficiently
- Supports both 2D (orthographic) and 3D (perspective) camera views
- Water effects use custom shaders with normal map textures

### Grid System

- Configurable grid size (default 20x20)
- Supports multiple vertical levels (-2 to 2)
- Elements can be single (1x1) or double (2x1) pontoons
- Grid coordinates are calculated from 3D world positions

### Recent Updates (2025-05-24)

✅ **Completed:**
- Migrated to Zustand for centralized state management
- Added localStorage persistence (auto-save/load)
- Integrated state management with existing components
- Prepared data structure for Symfony API integration

### Next Development Steps

**Immediate priorities:**
1. **UI Features**
   - Material list panel (show pontoon counts)
   - Rotation controls for elements
   - Clear grid confirmation dialog
   - Keyboard shortcuts

2. **Core Functionality**
   - Undo/Redo with Immer patches
   - JSON export/import for projects
   - Element rotation (0°, 90°, 180°, 270°)
   - Double pontoon placement validation

3. **Performance**
   - Complete instancing optimization
   - Improve grid rendering for large sizes

**Future Features (when backend ready):**
- Symfony API integration for persistence
- User authentication (JWT)
- Project management (save/load/list)
- PDF export for material lists
- Accessory system with placement rules

### Backend Architecture (Planned)

The app will remain a client-side React SPA with optional Symfony backend:
- **Frontend**: Complete state in Zustand, works offline
- **Backend**: Only for save/load, auth, and PDF export
- **API**: Simple REST endpoints with JWT authentication