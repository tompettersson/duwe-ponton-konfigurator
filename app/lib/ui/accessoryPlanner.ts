import * as THREE from 'three';
import { CoordinateCalculator, Grid, GridPosition } from '../domain';

type EdgeDirection = 'north' | 'south' | 'east' | 'west';

export type AccessoryType = 'pu-fender-2l' | 'pu-corner-fender' | 'ladder-placeholder';

export interface AccessoryPlacement {
  type: AccessoryType;
  level: number;
  position: THREE.Vector3;
  rotationY: number;
  span?: number;
  id: string;
  outward: THREE.Vector3;
}

interface EdgeSegment {
  level: number;
  direction: EdgeDirection;
  lineIndex: number;
  index: number;
  faceCenter: THREE.Vector3;
  outward: THREE.Vector3;
}

const CELL_SIZE_M = CoordinateCalculator.CONSTANTS.CELL_SIZE_MM / CoordinateCalculator.CONSTANTS.PRECISION_FACTOR;
const PONTOON_HEIGHT_M = CoordinateCalculator.CONSTANTS.PONTOON_HEIGHT_MM / CoordinateCalculator.CONSTANTS.PRECISION_FACTOR;
const SIDE_BAR_OUTWARD_OFFSET_M = 0.12; // pushes bar slightly away from pontoon skin
const CORNER_FENDER_OUTWARD_OFFSET_M = 0.18;
const LADDER_OUTWARD_OFFSET_M = 0.28; // ladder protrudes further outwards
const LADDER_VERTICAL_OFFSET_M = -PONTOON_HEIGHT_M * 0.35; // drop ladder closer to waterline
const LADDER_MIN_SEGMENT_RUN = 2; // require two adjacent segments for ladder brackets
const LADDER_ID_PREFIX = 'ladder';
const FENDER_ID_PREFIX = 'fender';
const CORNER_ID_PREFIX = 'corner-fender';

const DIRECTION_VECTORS: Record<EdgeDirection, THREE.Vector3> = {
  north: new THREE.Vector3(0, 0, -1),
  south: new THREE.Vector3(0, 0, 1),
  east: new THREE.Vector3(1, 0, 0),
  west: new THREE.Vector3(-1, 0, 0)
};

function hasPontoonAt(grid: Grid, x: number, y: number, z: number): boolean {
  if (x < 0 || z < 0) return false;
  if (x >= grid.dimensions.width || z >= grid.dimensions.height) return false;
  if (y < 0 || y >= grid.dimensions.levels) return false;
  try {
    return grid.hasPontoonAt(new GridPosition(x, y, z));
  } catch {
    return false;
  }
}

function collectEdgeSegments(grid: Grid): EdgeSegment[] {
  const segments: EdgeSegment[] = [];

  for (const pontoon of grid.pontoons.values()) {
    for (const cell of pontoon.getOccupiedPositions()) {
      if (cell.y !== 0) continue; // Focus on base level for first iteration

      const worldObj = grid.gridToWorld(cell);
      const world = new THREE.Vector3(worldObj.x, worldObj.y, worldObj.z);

      const northNeighbor = cell.z > 0 ? hasPontoonAt(grid, cell.x, cell.y, cell.z - 1) : false;
      if (!northNeighbor) {
        segments.push(createEdgeSegment(grid, cell, world, 'north'));
      }

      const southNeighbor = cell.z < grid.dimensions.height - 1 ? hasPontoonAt(grid, cell.x, cell.y, cell.z + 1) : false;
      if (!southNeighbor) {
        segments.push(createEdgeSegment(grid, cell, world, 'south'));
      }

      const westNeighbor = cell.x > 0 ? hasPontoonAt(grid, cell.x - 1, cell.y, cell.z) : false;
      if (!westNeighbor) {
        segments.push(createEdgeSegment(grid, cell, world, 'west'));
      }

      const eastNeighbor = cell.x < grid.dimensions.width - 1 ? hasPontoonAt(grid, cell.x + 1, cell.y, cell.z) : false;
      if (!eastNeighbor) {
        segments.push(createEdgeSegment(grid, cell, world, 'east'));
      }
    }
  }

  return segments;
}

function createEdgeSegment(grid: Grid, cell: GridPosition, world: THREE.Vector3, direction: EdgeDirection): EdgeSegment {
  const base = new THREE.Vector3(world.x, world.y, world.z);
  const outward = DIRECTION_VECTORS[direction].clone();
  const faceCenter = base.clone().add(outward.clone().multiplyScalar(CELL_SIZE_M / 2));

  let lineIndex: number;
  let index: number;

  switch (direction) {
    case 'north':
      lineIndex = cell.z;
      index = cell.x;
      break;
    case 'south':
      lineIndex = cell.z + 1;
      index = cell.x;
      break;
    case 'west':
      lineIndex = cell.x;
      index = cell.z;
      break;
    case 'east':
    default:
      lineIndex = cell.x + 1;
      index = cell.z;
      break;
  }

  return {
    level: cell.y,
    direction,
    lineIndex,
    index,
    faceCenter,
    outward
  };
}

function createSideBarPlacements(segments: EdgeSegment[]): AccessoryPlacement[] {
  const groups = new Map<string, EdgeSegment[]>();

  for (const segment of segments) {
    const key = `${segment.level}|${segment.direction}|${segment.lineIndex}`;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(segment);
    } else {
      groups.set(key, [segment]);
    }
  }

  const placements: AccessoryPlacement[] = [];

  for (const [, bucket] of groups) {
    bucket.sort((a, b) => a.index - b.index);

    for (let i = 0; i < bucket.length - 1; ) {
      const current = bucket[i];
      const next = bucket[i + 1];

      if (next.index === current.index + 1 && current.level === next.level && current.direction === next.direction) {
        const center = current.faceCenter.clone().add(next.faceCenter).multiplyScalar(0.5);
        const outward = current.outward.clone().setLength(SIDE_BAR_OUTWARD_OFFSET_M);
        center.add(outward);
        center.y = current.faceCenter.y;

        const rotationY = current.direction === 'east' || current.direction === 'west' ? Math.PI / 2 : 0;

        placements.push({
          type: 'pu-fender-2l',
          level: current.level,
          position: center,
          rotationY,
          span: 2,
          id: `${FENDER_ID_PREFIX}-${current.level}-${current.direction}-${current.lineIndex}-${current.index}`,
          outward: current.outward.clone()
        });

        i += 2;
      } else {
        i += 1;
      }
    }
  }

  return placements;
}

function createLadderPlacements(segments: EdgeSegment[]): AccessoryPlacement[] {
  const groups = new Map<string, EdgeSegment[]>();

  for (const segment of segments) {
    const key = `${segment.level}|${segment.direction}|${segment.lineIndex}`;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(segment);
    } else {
      groups.set(key, [segment]);
    }
  }

  const placements: AccessoryPlacement[] = [];

  for (const [, bucket] of groups) {
    if (bucket.length < LADDER_MIN_SEGMENT_RUN) continue;
    bucket.sort((a, b) => a.index - b.index);

    for (let i = 0; i <= bucket.length - LADDER_MIN_SEGMENT_RUN; i++) {
      let contiguous = true;
      for (let j = 1; j < LADDER_MIN_SEGMENT_RUN; j++) {
        if (bucket[i + j].index !== bucket[i].index + j) {
          contiguous = false;
          break;
        }
      }

      if (!contiguous) {
        continue;
      }

      const start = bucket[i];
      const end = bucket[i + LADDER_MIN_SEGMENT_RUN - 1];

      const center = start.faceCenter.clone().add(end.faceCenter).multiplyScalar(0.5);
      const outward = start.outward.clone().setLength(LADDER_OUTWARD_OFFSET_M);
      center.add(outward);
      center.y += LADDER_VERTICAL_OFFSET_M;

      const rotationY = start.direction === 'east' || start.direction === 'west' ? Math.PI / 2 : 0;

      placements.push({
        type: 'ladder-placeholder',
        level: start.level,
        position: center,
        rotationY,
        span: LADDER_MIN_SEGMENT_RUN,
        id: `${LADDER_ID_PREFIX}-${start.level}-${start.direction}-${start.lineIndex}-${start.index}`,
        outward: start.outward.clone()
      });
    }
  }

  return placements;
}

function createCornerPlacements(grid: Grid): AccessoryPlacement[] {
  const placements: AccessoryPlacement[] = [];

  for (const pontoon of grid.pontoons.values()) {
    for (const cell of pontoon.getOccupiedPositions()) {
      if (cell.y !== 0) continue;

      const worldObj = grid.gridToWorld(cell);
      const world = new THREE.Vector3(worldObj.x, worldObj.y, worldObj.z);

      const hasNorth = cell.z > 0 ? hasPontoonAt(grid, cell.x, cell.y, cell.z - 1) : false;
      const hasSouth = cell.z < grid.dimensions.height - 1 ? hasPontoonAt(grid, cell.x, cell.y, cell.z + 1) : false;
      const hasWest = cell.x > 0 ? hasPontoonAt(grid, cell.x - 1, cell.y, cell.z) : false;
      const hasEast = cell.x < grid.dimensions.width - 1 ? hasPontoonAt(grid, cell.x + 1, cell.y, cell.z) : false;

      const scenarios: Array<{ dirX: -1 | 1; dirZ: -1 | 1; needed: boolean }>
        = [
          { dirX: -1, dirZ: -1, needed: !hasNorth && !hasWest },
          { dirX: 1, dirZ: -1, needed: !hasNorth && !hasEast },
          { dirX: -1, dirZ: 1, needed: !hasSouth && !hasWest },
          { dirX: 1, dirZ: 1, needed: !hasSouth && !hasEast }
        ];

      for (const scenario of scenarios) {
        if (!scenario.needed) continue;

        const offset = new THREE.Vector3(
          scenario.dirX * (CELL_SIZE_M / 2),
          0,
          scenario.dirZ * (CELL_SIZE_M / 2)
        );

        const position = world.clone()
          .add(offset)
          .add(new THREE.Vector3(scenario.dirX, 0, scenario.dirZ).normalize().multiplyScalar(CORNER_FENDER_OUTWARD_OFFSET_M));

        // Slightly align to deck plane midpoint
        position.y = world.y + PONTOON_HEIGHT_M * 0.05;

        const rotationY = Math.atan2(scenario.dirZ, scenario.dirX);

        placements.push({
          type: 'pu-corner-fender',
          level: cell.y,
          position,
          rotationY,
          id: `${CORNER_ID_PREFIX}-${cell.x}-${cell.z}-${scenario.dirX}-${scenario.dirZ}`,
          outward: new THREE.Vector3(scenario.dirX, 0, scenario.dirZ).normalize()
        });
      }
    }
  }

  return placements;
}

export function computeAccessoryPlacements(grid: Grid): AccessoryPlacement[] {
  if (grid.pontoons.size === 0) {
    return [];
  }

  const segments = collectEdgeSegments(grid);
  const ladderPlacements = createLadderPlacements(segments);
  const edgePlacements = createSideBarPlacements(segments);
  const cornerPlacements = createCornerPlacements(grid);

  return [...ladderPlacements, ...edgePlacements, ...cornerPlacements];
}
