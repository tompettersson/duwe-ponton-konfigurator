import * as THREE from 'three';
import { CoordinateCalculator, Grid } from '../domain';

export type ConnectorVariant = 'standard' | 'long';

export interface ConnectorPlacement {
  key: string;
  level: number;
  lugCount: number;
  worldPosition: THREE.Vector3;
  corner: { x: number; z: number };
  hasLowerSupport: boolean;
  pontoonIds: string[];
}

interface IntersectionEntry {
  level: number;
  cells: Set<string>;
  pontoonIds: Set<string>;
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
    pontoonId: string
  ) => {
    const key = `${level}:${corner.x}:${corner.z}`;
    let entry = intersections.get(key);
    if (!entry) {
      entry = {
        level,
        cells: new Set<string>(),
        pontoonIds: new Set<string>()
      };
      intersections.set(key, entry);
    }
    entry.cells.add(cellKey);
    entry.pontoonIds.add(pontoonId);
  };

  for (const pontoon of grid.pontoons.values()) {
    for (const cell of pontoon.getOccupiedPositions()) {
      const cellKey = `${cell.x},${cell.z}`;
      const corners = [
        { x: cell.x, z: cell.z },
        { x: cell.x + 1, z: cell.z },
        { x: cell.x, z: cell.z + 1 },
        { x: cell.x + 1, z: cell.z + 1 }
      ];

      for (const corner of corners) {
        registerIntersection(cell.y, corner, cellKey, pontoon.id);
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

    placements.push({
      key,
      level: data.level,
      lugCount,
      worldPosition: new THREE.Vector3(world.x, world.y, world.z),
      corner,
      hasLowerSupport,
      pontoonIds: Array.from(data.pontoonIds)
    });
  }

  return placements;
}

export function determineConnectorVariant(placement: ConnectorPlacement): ConnectorVariant {
  return placement.level > 0 && placement.hasLowerSupport ? 'long' : 'standard';
}
