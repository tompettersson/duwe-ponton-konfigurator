# Critical Knowledge: 3D Model Analysis

## Key Discovery
**DO NOT manually calibrate measurements.** Instead, **parse OBJ model files directly** to extract exact geometry data.

## Methodology
1. **Parse OBJ vertices** to get exact 3D coordinates
2. **Identify corner positions** by filtering vertices at extreme X/Z combinations
3. **Extract height values** from the appropriate axis (Y or Z depending on model orientation)
4. **Update configuration** with extracted values

## Tools & Scripts
- **Double Pontoon:** `scripts/analyze-pontoon-lugs.ts`
- **Single Pontoon:** `scripts/analyze-single-pontoon.ts`
- **Usage:** `npx tsx scripts/analyze-pontoon-lugs.ts`

## Results Location
All extracted measurements and configurations are documented in:
- **Documentation:** `docs/pontoon-configuration.md`
- **Configuration:** `app/lib/domain/PontoonTypes.ts`
- **Rendering:** `app/lib/ui/RenderingEngine.ts`

## Verified Pontoon Data

### Double Pontoon Lug Heights (from bottom)
- NW/W: 266mm → Layer 4
- SW: 250mm → Layer 3
- SO: 234mm → Layer 2
- NO/O: 216.5mm → Layer 1

### Single Pontoon Lug Heights (from bottom)
- NE: 272mm → Layer 4
- SE: 256mm → Layer 3
- SW: 240mm → Layer 2
- NW: 224mm → Layer 1

## Next Steps for Accessories
Apply the same methodology to:
- Connectors (Verbinder)
- Edge Connectors (Randverbinder)
- Spacers (Distanzscheiben)
- Drain Plugs (Flutschraube)

All OBJ files are located in `/public/3d/` subdirectories.
