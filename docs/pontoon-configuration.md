# Pontoon Configuration Knowledge Base

## Model Analysis Methodology

### Discovery
Instead of manual calibration, we can **extract exact measurements directly from the 3D models** by parsing OBJ files and analyzing vertex positions.

### Analysis Tool
- **Location:** `scripts/analyze-pontoon-lugs.ts`
- **Purpose:** Parse OBJ model files to extract exact lug Y-coordinates
- **Method:** Identify vertices at corner positions (extreme X/Z combinations) and extract their Y-coordinates

### Key Insight
The OBJ models contain precise geometry data. By analyzing corner vertices, we can determine exact lug attachment heights without manual measurement or calibration.

---

## Double Pontoon (Doppelelement)

### Model Files
- **Primary:** `/public/3d/neu/Ponton_doublle.obj`
- **Dimensions:** 1107.59mm (W) × 405mm (H) × 607.59mm (D)

### Orientation (Internal/North)
- **North:** Internal direction, X-axis maximum
- **South:** X-axis minimum
- **West:** Z-axis minimum (Z=0)
- **East:** Z-axis maximum (Z=1)
- **Rotation:** Independent of 3D world rotation

### Lug Positions & Heights (Extracted from OBJ Model)

| Position | Grid Coord | Height from Bottom | Layer | Layer Height |
|----------|------------|-------------------|-------|--------------|
| NW       | (2,0)      | 266mm            | 4     | 266mm        |
| W        | (1,0)      | 266mm            | 4     | 266mm        |
| SW       | (0,0)      | 250mm            | 3     | 250mm        |
| NO       | (2,1)      | 216.5mm          | 1     | 216.5mm      |
| O        | (1,1)      | 216.5mm          | 1     | 216.5mm      |
| SO       | (0,1)      | 234mm            | 2     | 234mm        |

### Layer Height Reference
```typescript
const DOUBLE_PONTOON_LAYER_HEIGHTS = [216.5, 234, 250, 266]; // mm (Layer 1-4)
```

### Configuration
```typescript
[PontoonType.DOUBLE]: {
  '0,0': { layer: 3 }, // SW: 250mm
  '1,0': { layer: 4 }, // W: 266mm
  '2,0': { layer: 4 }, // NW: 266mm
  '0,1': { layer: 2 }, // SO: 234mm
  '1,1': { layer: 1 }, // O: 216.5mm
  '2,1': { layer: 1 }  // NO: 216.5mm
}
```

---

## Single Pontoon (Einzelelement)

### Model Files
- **Primary:** `/public/3d/neu/Ponton_single.obj`
- **Dimensions:** 605mm (W) × 605mm (H) × 402mm (D)
- **Note:** Z-axis is the smallest (402mm) and becomes Y after ModelLoader alignment

### Orientation (Internal/North)
- **North:** Internal direction, X-axis maximum
- **South:** X-axis minimum  
- **West:** Z-axis minimum (Z=0)
- **East:** Z-axis maximum (Z=1)

### Lug Positions & Heights (Extracted from OBJ Model)

| Position | Grid Coord | Height from Bottom | Layer | Layer Height |
|----------|------------|-------------------|-------|--------------|
| NW       | (0,0)      | 224mm            | 1     | 224mm        |
| NE       | (1,0)      | 272mm            | 4     | 272mm        |
| SW       | (0,1)      | 240mm            | 2     | 240mm        |
| SE       | (1,1)      | 256mm            | 3     | 256mm        |

### Layer Height Reference
```typescript
const SINGLE_PONTOON_LAYER_HEIGHTS = [224, 240, 256, 272]; // mm (Layer 1-4)
```

### Configuration
```typescript
[PontoonType.SINGLE]: {
  '0,0': { layer: 1 }, // NW: 224mm
  '1,0': { layer: 4 }, // NE: 272mm
  '0,1': { layer: 2 }, // SW: 240mm
  '1,1': { layer: 3 }  // SE: 256mm
}
```

---

## Accessories (Zubehör)

### Connectors (Verbinder)
- **Standard:** `/3d/fc/Verbinder.obj`
- **Long:** `/3d/fc/Verbinderlang.obj`

### Edge Connectors (Randverbinder)
- **Bolt:** `/3d/fc/Randverbinder1.obj`
- **Nut:** `/3d/fc/Randverbinder2.obj`

### Spacers (Distanzscheiben)
- **Single:** `/3d/fc/Einzel-Scheibe.obj`
- **Double:** `/3d/fc/Scheibe.obj`

### Drain Plug (Flutschraube)
- **Model:** `/3d/fc/Flutschraube.obj`

### Analysis Status
All accessories: **Analysis pending**

---

## Implementation References

### Configuration Files
- **Pontoon Types:** `app/lib/domain/PontoonTypes.ts`
- **Layer Heights:** `app/lib/ui/RenderingEngine.ts` (line ~976)
- **Model Loader:** `app/lib/ui/ModelLoader.ts`

### Analysis Script
- **Path:** `scripts/analyze-pontoon-lugs.ts`
- **Usage:** `npx tsx scripts/analyze-pontoon-lugs.ts`

---

## Notes

- All measurements are in millimeters (mm)
- Heights are measured from the model's local bottom (minY)
- Grid coordinates are in local pontoon space (0-indexed)
- Rotation affects world placement but not internal lug configuration
