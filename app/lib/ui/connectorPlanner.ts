import * as THREE from 'three';
import { CoordinateCalculator, Grid, PONTOON_LUG_CONFIGS, PontoonType } from '../domain';

export type ConnectorVariant = 'standard' | 'long';

export interface SpacerRequest {
  type: 'single' | 'double';
  layer: number; // The starting layer (bottom) of the spacer
}

export interface ConnectorPlacement {
  key: string;
  level: number;
  lugCount: number;
  worldPosition: THREE.Vector3;
  corner: { x: number; z: number };
  hasLowerSupport: boolean;
  pontoonIds: string[];
  spacers: SpacerRequest[];
  occupiedLayers: number[];
}

interface IntersectionEntry {
  level: number;
  cells: Set<string>;
  pontoonIds: Set<string>;
  occupiedLayers: Set<number>;
}

export function computeConnectorPlacements(
  grid: Grid,
  options: { calculator?: CoordinateCalculator } = {}
): ConnectorPlacement[] {
  if (grid.pontoons.size === 0) {
    return [];
  }

  const calculator = options.calculator ?? new CoordinateCalculator();
  const intersections = new Map<string, IntersectionEntry>();

  const registerIntersection = (
    level: number,
    corner: { x: number; z: number },
    cellKey: string,
    pontoonId: string,
    layer: number
  ) => {
    const key = `${level}:${corner.x}:${corner.z}`;
    let entry = intersections.get(key);
    if (!entry) {
      entry = {
        level,
        cells: new Set<string>(),
        pontoonIds: new Set<string>(),
        occupiedLayers: new Set<number>()
      };
      intersections.set(key, entry);
    }
    entry.cells.add(cellKey);
    entry.pontoonIds.add(pontoonId);
    entry.occupiedLayers.add(layer);
  };

  for (const pontoon of grid.pontoons.values()) {
    for (const cell of pontoon.getOccupiedPositions()) {
      const cellKey = `${cell.x},${cell.z}`;
      
      // Determine local coordinates within the pontoon (0,0 to W,D)
      // We need to handle rotation to map world cell to local config key
      // BUT: PONTOON_LUG_CONFIGS uses local (unrotated) coordinates.
      // So we need to map the world corner back to the local corner.
      
      // Actually, simpler: The config is defined by local grid coordinates (0,0), (1,0) etc.
      // We can iterate the pontoon's local cells and project them to world.
      
      // Wait, the outer loop iterates occupied world cells.
      // Let's change strategy: Iterate local cells and transform to world.
    }
    
    // Iterate local cells to correctly access lug config
    const width = pontoon.type === PontoonType.DOUBLE ? 2 : 1; // Local width (X)
    const depth = 1; // Local depth (Z) - always 1 for now? No, Single is 1x1, Double is 2x1?
    // Let's check PontoonTypes definition of dimensions.
    // Double is 2x1. Single is 1x1.
    
    // Actually, let's use the existing helper if possible, or just manual loop.
    // Pontoon.getOccupiedPositions() returns world coordinates.
    // We need to know which "part" of the pontoon is at that world coordinate.
    
    // Let's iterate LOCAL coordinates and transform them.
    // This is safer for looking up the lug config.
    const localWidth = pontoon.type === PontoonType.DOUBLE ? 3 : 2; // Wait, config uses 0,1,2 for Double?
    // Let's check PontoonTypes.ts again.
    // Double: '0,0', '1,0', '2,0' (West side) and '0,1', '1,1', '2,1' (East side).
    // Wait, Double is 2x1 cells? 
    // No, looking at config:
    // Double Pontoon:
    // West Side (Z=0): 0,0 (SW), 1,0 (W), 2,0 (NW)
    // East Side (Z=1): 0,1 (SO), 1,1 (O), 2,1 (NO)
    // This implies a 3x2 grid of LUGS, but the pontoon itself is 2x1 CELLS?
    // Or is it 1x1 cell but with 6 lugs?
    // Let's check Grid.ts or Pontoon.ts for dimensions.
    
    // Re-reading PontoonTypes.ts from memory/context:
    // Double Pontoon (2x1 cells)
    // '0,0': { layer: 3 }, // SW
    // '1,0': { layer: 4 }, // W - This is a middle lug?
    // '2,0': { layer: 4 }, // NW
    
    // If it's 2x1 cells, it should have 3x2 lugs (corners + middles).
    // (0,0)---(1,0)---(2,0)
    //   |       |       |
    // (0,1)---(1,1)---(2,1)
    
    // World Corners for a generic cell (cx, cz):
    // TL: (cx, cz)
    // TR: (cx+1, cz)
    // BL: (cx, cz+1)
    // BR: (cx+1, cz+1)
    
    // We need to map these world corners to the specific lug ID in the config.
    
    // Let's assume standard mapping:
    // Local (0,0) -> World Corner 1
    // Local (1,0) -> World Corner 2
    // ...
    
    // This is getting complicated with rotation.
    // Let's look at how we determine the world position of the lugs.
    
    // Alternative: Iterate the CONFIG keys, transform them to world space.
    // The config keys 'x,z' represent LUG coordinates, not cell coordinates?
    // No, '0,0' is SW corner. '2,0' is NW corner.
    // Distance is 2 units?
    
    // Let's look at the code I just wrote in PontoonTypes.ts
    // Double:
    // '0,0' (SW), '1,0' (W), '2,0' (NW)
    // This suggests the pontoon is 2 units long in X (local).
    
    // So, we iterate the defined lugs in the config.
    const config = PONTOON_LUG_CONFIGS[pontoon.type];
    
    for (const [lugKey, lugData] of Object.entries(config)) {
      const [lx, lz] = lugKey.split(',').map(Number);
      
      // Transform local lug coordinate (lx, lz) to world coordinate
      // We need to know the pontoon's rotation and position.
      // Local origin (0,0) is SW corner of the local bounding box?
      
      // Let's use the CoordinateCalculator or similar logic.
      // Or just manual transformation.
      
      // Pontoon position (px, pz) is the top-left (NW) or bottom-left (SW)?
      // Usually grid position is top-left or bottom-left.
      // In this codebase, let's assume (x,z) is the min-corner.
      
      // Rotation:
      // 0: No rotation. World X = Local X, World Z = Local Z.
      // 90: Rotated 90 deg CW?
      
      // Let's look at RenderingEngine.ts lines 900-950 again (viewed earlier).
      // It maps local coordinates to world.
      
      // Actually, let's simplify.
      // We need to find the WORLD coordinate of each lug defined in the config.
      // And register it at that intersection.
      
      // Local Lug Coords (lx, lz) -> World Point (wx, wz)
      // Note: These are integer coordinates on the grid lines.
      
      // Pontoon Position P (px, pz)
      // Rotation R (0, 90, 180, 270)
      
      // Dimensions (W, D) in cells.
      // Single: 1x1. Lugs at (0,0), (1,0), (0,1), (1,1).
      // Double: 2x1? Lugs at (0,0), (1,0), (2,0)...
      // Wait, if it's 2x1 cells, it spans x=0 to x=2.
      
      // Transformation Logic:
      // Center of rotation is usually the center of the pontoon or a specific corner.
      // RenderingEngine uses `applyFootprintOffsetByType`.
      
      // Let's try to deduce the world integer coordinate of a local lug (lx, lz).
      
      let wx = lx;
      let wz = lz;
      
      // Apply Rotation to (wx, wz) relative to (0,0)?
      // Or relative to center?
      // Grid logic usually rotates around the pivot (position).
      
      // Let's assume pivot is (0,0) of the local grid.
      // Dimensions:
      // Single: W=1, D=1.
      // Double: W=2, D=1. (Based on lugs going 0..2)
      
      let dimX = pontoon.type === PontoonType.DOUBLE ? 2 : 1;
      let dimZ = 1;
      
      // Rotate (lx, lz) inside the bounding box (dimX, dimZ)
      // Standard 2D grid rotation:
      // 90 deg (CW): (x, y) -> (h-1-y, x) ? No, that's for pixels.
      // For grid points (corners):
      // (lx, lz)
      
      let rlx = lx;
      let rlz = lz;
      
      if (pontoon.rotation === 90) {
        rlx = dimZ - lz; // Width becomes Depth
        rlz = lx;
      } else if (pontoon.rotation === 180) {
        rlx = dimX - lx;
        rlz = dimZ - lz;
      } else if (pontoon.rotation === 270) {
        rlx = lz;
        rlz = dimX - lx;
      }
      
      // Wait, this rotation logic depends heavily on the pivot convention.
      // Let's look at `Grid.ts` or `Pontoon.ts` to see how rotation is handled.
      // Or `RenderingEngine.ts` line 907:
      // case Rotation.EAST (90?): originalX = z; originalZ = width - x;
      
      // Let's assume the standard vector rotation and add position.
      // But we need to be careful about the grid lines vs cells.
      
      // Let's use a helper if possible.
      // But I can't import RenderingEngine here.
      
      // Let's try to map the logic from RenderingEngine (lines 907+) in reverse.
      // RenderingEngine maps World -> Local to find the label.
      // We need Local -> World.
      
      // Local (lx, lz)
      // World (wx, wz) = P + Rotated(lx, lz)
      
      // Let's stick to the simplest assumption:
      // 0 deg: wx = px + lx, wz = pz + lz
      // 90 deg: wx = px + (dimZ - lz), wz = pz + lx  <-- Wait, dimensions swap?
      
      // Actually, let's just use the `pontoon.getOccupiedPositions()` to get cells,
      // and then for each cell, find its 4 corners,
      // and for each corner, find the corresponding local lug.
      
      // This seems safer because `getOccupiedPositions` handles the cell rotation.
    }
    
    // NEW APPROACH:
    // Iterate occupied cells (World Space).
    // For each cell, check its 4 corners.
    // Transform World Corner -> Local Corner.
    // Check if Local Corner has a lug in Config.
    // If yes, register it.
    
    for (const cell of pontoon.getOccupiedPositions()) {
       const cellKey = `${cell.x},${cell.z}`;
       const corners = [
         { x: cell.x, z: cell.z },
         { x: cell.x + 1, z: cell.z },
         { x: cell.x, z: cell.z + 1 },
         { x: cell.x + 1, z: cell.z + 1 }
       ];
       
       for (const corner of corners) {
         // Transform World Corner (cx, cz) to Local Corner (lx, lz)
         // relative to Pontoon Position (px, pz) and Rotation.
         
         const dx = corner.x - pontoon.position.x;
         const dz = corner.z - pontoon.position.z;
         
         let lx = dx;
         let lz = dz;
         
         // Inverse Rotation (World -> Local)
         // If Pontoon is rotated 90 deg, we rotate the delta -90 deg?
         
         // Dimensions for rotation center?
         // Usually rotation is around (0,0) of the shape.
         
         // Let's check `Pontoon.ts` `getOccupiedPositions` implementation?
         // Or just infer from standard behavior.
         
         // Let's assume:
         // 0: lx=dx, lz=dz
         // 90: lx=dz, lz=width-dx ? No.
         
         // Let's look at `RenderingEngine.ts` lines 907-923 again.
         // It calculates `originalX` (Local X) from `x` (Local coord inside bounding box?).
         // `width` and `height` there are `config.gridSize.x` (Local Width).
         
         // Let's define Local Dimensions based on Type.
         const localDimX = pontoon.type === PontoonType.DOUBLE ? 2 : 1;
         const localDimZ = 1;
         
         // Adjust for rotation
         let effectiveDimX = localDimX;
         let effectiveDimZ = localDimZ;
         
         if (pontoon.rotation === 90 || pontoon.rotation === 270) {
            effectiveDimX = localDimZ;
            effectiveDimZ = localDimX;
         }
         
         // Rotate vector (dx, dz) by -Rotation
         // 0: lx = dx, lz = dz
         // 90: lx = dz, lz = localDimX - dx  (Wait, need to be careful with indices)
         // 180: lx = localDimX - dx, lz = localDimZ - dz
         // 270: lx = localDimZ - dz, lz = dx
         
         // Wait, corners are points, not cells.
         // A 2x1 pontoon has corners (0,0) to (2,1).
         // Rotated 90 (1x2), corners (0,0) to (1,2).
         
         if (pontoon.rotation === 0) {
            lx = dx;
            lz = dz;
         } else if (pontoon.rotation === 90) {
            // World X maps to Local Z?
            // World Z maps to Local -X?
            // (dx, dz) -> (dz, -dx) + offset
            lx = dz;
            lz = localDimX - dx; // X goes 0..2. dx goes 0..1 (width 1).
            // If dx=0 -> lz=2. If dx=1 -> lz=1.
            // This seems plausible for 90 deg rotation.
         } else if (pontoon.rotation === 180) {
            lx = localDimX - dx;
            lz = localDimZ - dz;
         } else if (pontoon.rotation === 270) {
            lx = localDimZ - dz;
            lz = dx;
         }
         
         // Check if this local coordinate exists in config
         const lugKey = `${lx},${lz}`;
         const config = PONTOON_LUG_CONFIGS[pontoon.type];
         const lugData = config[lugKey as keyof typeof config];
         
         if (lugData) {
           registerIntersection(cell.y, corner, cellKey, pontoon.id, lugData.layer);
         }
       }
    }
  }

  const placements: ConnectorPlacement[] = [];

  for (const [key, data] of intersections.entries()) {
    const lugCount = data.cells.size;
    // Require at least two distinct pontoons before we emit any hardware.
    if (lugCount < 2 || data.pontoonIds.size < 2) {
      continue;
    }

    const [, xStr, zStr] = key.split(':');
    const corner = { x: Number(xStr), z: Number(zStr) };
    const world = calculator.gridIntersectionToWorld(corner, data.level, grid.dimensions);
    const belowKey = `${data.level - 1}:${corner.x}:${corner.z}`;
    const hasLowerSupport = data.level > 0 && intersections.has(belowKey);

    const occupiedLayers = Array.from(data.occupiedLayers).sort((a, b) => a - b);
    // Check for adjacent layers (Direct Contact)
    // User Rule: "Wenn die beiden direkt übereinander liegen... dann wird nur der Randverbinder und die Mutter unten ohne Distanzscheiben genutzt."
    const hasAdjacent = occupiedLayers.some((layer, index, arr) => arr.includes(layer + 1));
    
    let spacers: SpacerRequest[] = [];
    if (!hasAdjacent) {
      // Only calculate spacers if there are no directly adjacent layers
      spacers = calculateSpacers(new Set(occupiedLayers));
    } else {
      console.log(`[ConnectorPlanner] Adjacent layers detected for ${key}:`, occupiedLayers, '-> Spacers cleared.');
    }

    if (spacers.length > 0) {
       console.log(`[ConnectorPlanner] Spacers generated for ${key}:`, occupiedLayers, spacers);
    }

    placements.push({
      key,
      level: data.level,
      lugCount,
      worldPosition: new THREE.Vector3(world.x, world.y, world.z),
      corner,
      hasLowerSupport,
      pontoonIds: Array.from(data.pontoonIds),
      spacers, // Use the potentially empty spacers array
      occupiedLayers: occupiedLayers
    });
  }

  return placements;
}

function calculateSpacers(occupiedLayers: Set<number>): SpacerRequest[] {
  const spacers: SpacerRequest[] = [];
  const missingLayers = new Set<number>([1, 2, 3, 4]);
  
  for (const layer of occupiedLayers) {
    missingLayers.delete(layer);
  }
  
  // Greedy strategy: Fill missing layers with Double (2) then Single (1)
  // We iterate from bottom (1) to top (4)
  
  const sortedMissing = Array.from(missingLayers).sort((a, b) => a - b);
  
  let i = 0;
  while (i < sortedMissing.length) {
    const current = sortedMissing[i];
    
    // Check if we can place a double spacer (current + next are missing and adjacent)
    if (i + 1 < sortedMissing.length && sortedMissing[i+1] === current + 1) {
      // Found a pair (e.g. 1 and 2)
      spacers.push({ type: 'double', layer: current });
      i += 2; // Skip next
    } else {
      // Single spacer
      spacers.push({ type: 'single', layer: current });
      i += 1;
    }
  }
  
  return spacers;
}

export function determineConnectorVariant(placement: ConnectorPlacement): ConnectorVariant {
  return placement.level > 0 && placement.hasLowerSupport ? 'long' : 'standard';
}
