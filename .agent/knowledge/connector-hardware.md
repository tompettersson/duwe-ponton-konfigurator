# Edge Connector Hardware Implementation

**Last Updated:** 2025-11-24

## Overview
This document tracks the implementation and refinement of edge connector hardware (Pin/Randverbinder, Nut/Mutter, Spacers/Distanzscheiben) in the 3D pontoon visualization.

## Model Assignments

### Correct Model Mappings
- **Pin (Randverbinder/Bolt)**: `Randverbinder1.obj` (~80mm diameter, 105mm height)
- **Nut (Mutter)**: `Randverbinder2.obj` (~80mm diameter, 30mm height) 
- **Double Spacer**: `Scheibe.obj` (32mm height)
- **Single Spacer**: `Einzel-Scheibe.obj`

### Important Fix (2024-11-24)
`ModelLoader.ts` was incorrectly loading `Flutschraube.obj` as the nut. This has been corrected to use `Randverbinder2.obj`.

## Positioning Logic

### Pin (Randverbinder1)
- **Position**: Top of lug stack
- **Calculation**: `stackTopY + PIN_OFFSET`
- **Current Offset**: `+3mm` (leaves small gap to top lug)
- **Logic**: Based on `occupiedLayers` to determine stack height

### Nut (Randverbinder2)
- **Position**: Bottom of lug stack  
- **Calculation**: `stackBottomY - NUT_OFFSET`
- **Current Offset**: `-7mm` (creates visible gap below bottom lug)
- **Refinement Process**: Adjusted based on visual analysis using lug height (16mm) as reference

### Spacers

#### South Side (L2-L3 Adjacent)
- **Type**: No spacer rendered
- **Logic**: `connectorPlanner.ts` detects adjacent layers and forces empty `spacers` array

#### North Side (L1-L4 Gap)
- **Type**: Double spacer
- **Position Y**: `+42mm` from pontoon center
- **Position X**: `+8mm` offset (centered over lug hole)
- **Scaling**: No Y-scaling applied (removed `gapScaleFactor` that was stretching spacer)

## Material Styling

All edge connector hardware uses dark materials:
- **Pin**: `#1b1b1f` (very dark grey)
- **Nut**: `#4b4b50` (medium dark grey)
- **Spacers**: `#2b2b2f` (dark grey) - changed from orange/yellow debug colors

## Key Files Modified

- `app/lib/ui/ModelLoader.ts`: Fixed nut model assignment
- `app/lib/ui/RenderingEngine.ts`: 
  - Hardware positioning logic (lines ~1730-1800)
  - Spacer rendering logic (lines ~1660-1680)
  - Material definitions (lines ~2367-2390)
- `app/lib/ui/connectorPlanner.ts`: Adjacent layer detection for spacer suppression

## Lessons Learned

1. **Visual Calibration**: Use known dimensions (lug height = 16mm) as reference for estimating gaps
2. **Model Analysis**: Always verify model assignments with dimension analysis scripts
3. **Iterative Refinement**: Small adjustments (2mm, 8mm) based on screenshots are more effective than large changes
4. **Coordinate Systems**: All positions relative to pontoon center (200mm from bottom)

## Layer Coordinate Reference

```
Layer Centers (mm from pontoon bottom):
L1: 224mm (+24mm from center)
L2: 240mm (+40mm from center)  
L3: 256mm (+56mm from center)
L4: 272mm (+72mm from center)

Layer Heights: 16mm each
Pontoon Center: 200mm from bottom
```
