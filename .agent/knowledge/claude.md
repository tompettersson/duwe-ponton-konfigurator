# Claude AI Agent Notes

**Project:** Pontoon Configurator  
**Last Session:** 2025-11-24

## Current Status (2024-11-24)

### Completed: Edge Connector Hardware Placement

Successfully refined the 3D visualization of edge connector hardware (Pin, Nut, Spacers) with millimeter-precise positioning.

**Key Achievements:**
- ✅ Fixed nut model assignment (`Randverbinder2.obj` instead of `Flutschraube.obj`)
- ✅ Pin positioned at top of lug stack with 3mm clearance
- ✅ Nut positioned below bottom lug with 7mm offset (visible gap)
- ✅ North side double spacer correctly positioned and scaled
- ✅ South side spacer suppression for adjacent layers working
- ✅ All hardware materials changed to dark grey/black

**Files Modified:**
- `app/lib/ui/ModelLoader.ts` - Model assignments
- `app/lib/ui/RenderingEngine.ts` - Positioning logic, materials
- `app/lib/ui/connectorPlanner.ts` - Spacer detection logic

## Architecture Overview

### Domain Layer (`app/lib/domain/`)
- Immutable grid/pontoon services
- Single source of truth for state
- No direct Three.js dependencies

### UI Layer (`app/lib/ui/`)
- **RenderingEngine**: Main Three.js rendering orchestrator
- **ModelLoader**: OBJ/MTL loading and caching
- Interaction services (click detection, hover, etc.)

### Component Layer (`app/components/`)
- **NewPontoonConfigurator**: React entry point
- Bridges domain layer with RenderingEngine

## Important Coordinate Systems

### Pontoon Coordinates
- **Height**: 400mm total
- **Center**: 200mm from bottom
- All Y-positions relative to center

### Layer Positions (from bottom)
```
L1: 224mm (+24mm from center) 
L2: 240mm (+40mm from center)
L3: 256mm (+56mm from center)
L4: 272mm (+72mm from center)
```

## Common Pitfalls

1. **Model Assignments**: Always verify with dimension analysis scripts (`scripts/analyze-*.ts`)
2. **Y-Coordinates**: Remember pontoon center is at 200mm, not 0mm
3. **Scaling**: Don't apply arbitrary scale factors without understanding model dimensions
4. **Materials**: Material cache is key-based - changes require new keys or cache clear

## Testing Approach

- Use screenshots with known dimensions (lug height = 16mm) as visual reference
- Make small incremental adjustments (2-8mm typical)
- Test both North (L1-L4 gap) and South (L2-L3 adjacent) configurations

## Next Priorities

See `task.md` for current work breakdown. Focus areas:
- Connector placement verification across all pontoon types
- Additional hardware components if needed
- Performance optimization for large grids

## Documentation Structure

- **README.md**: High-level project overview
- **.agent/knowledge/connector-hardware.md**: Detailed hardware implementation
- **.agent/knowledge/model-analysis.md**: Model dimension reference
- **docs/pontoon-configuration.md**: Domain modeling reference
