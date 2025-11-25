#!/usr/bin/env tsx

/**
 * Edge Hardware Report
 *
 * Generates connector + washer diagnostics for several canonical layouts.
 * Run via:  npx tsx tools/edge-hardware-report.ts
 */

import {
  Grid,
  GridPosition,
  PontoonType,
  PontoonColor,
  Rotation,
} from '../app/lib/domain';
import {
  computeConnectorPlacements,
  determineConnectorVariant,
  type ConnectorPlacement,
} from '../app/lib/ui/connectorPlanner';

type PontoonInput = {
  x: number;
  z: number;
  level?: number;
  type?: PontoonType;
  color?: PontoonColor;
  rotation?: Rotation;
};

type Scenario = {
  name: string;
  description: string;
  gridSize?: { width: number; height: number; levels: number };
  pontoons: PontoonInput[];
};

type EdgeSummary = {
  level: number;
  corner: string;
  lugCount: number;
  spacer: 'double' | 'single';
  variant: 'standard' | 'long';
  hasLowerSupport: boolean;
  pontoonIds: string[];
};

const scenarios: Scenario[] = [
  {
    name: 'Single Pontoon',
    description: 'Baseline – single 1×1 pontoon, all four corners exposed',
    pontoons: [{ x: 10, z: 10 }],
  },
  {
    name: 'Two Adjacent (East-West)',
    description: 'Two single pontoons side by side to create shared interior',
    pontoons: [
      { x: 10, z: 10 },
      { x: 11, z: 10 },
    ],
  },
  {
    name: 'L-Shape (3 pontoons)',
    description: 'Corner with three touching pontoons (should yield lugCount=3 edges)',
    pontoons: [
      { x: 10, z: 10 },
      { x: 11, z: 10 },
      { x: 10, z: 11 },
    ],
  },
  {
    name: 'Double Pontoon Block',
    description: 'One 2×1 pontoon plus two singles to check mixed footprints',
    pontoons: [
      { x: 10, z: 10, type: PontoonType.DOUBLE },
      { x: 12, z: 10 },
      { x: 12, z: 11 },
    ],
  },
  {
    name: 'Stacked Level (Long Connector Check)',
    description: 'Level 1 pontoon directly above Level 0 support',
    pontoons: [
      { x: 15, z: 15 },
      { x: 15, z: 15, level: 1 },
    ],
  },
];

function buildGrid(scenario: Scenario): Grid {
  const size = scenario.gridSize ?? { width: 30, height: 30, levels: 3 };
  let grid = Grid.createEmpty(size.width, size.height, size.levels);

  for (const pontoon of scenario.pontoons) {
    const position = new GridPosition(
      pontoon.x,
      pontoon.level ?? 0,
      pontoon.z,
    );
    grid = grid.placePontoon(
      position,
      pontoon.type ?? PontoonType.SINGLE,
      pontoon.color ?? PontoonColor.BLUE,
      pontoon.rotation ?? Rotation.NORTH,
    );
  }

  return grid;
}

function summarizeEdges(grid: Grid): EdgeSummary[] {
  const placements = computeConnectorPlacements(grid);
  return placements
    .filter((placement) => placement.lugCount >= 1 && placement.lugCount <= 3)
    .map((placement) => {
      const variant = determineConnectorVariant(placement);
      return {
        level: placement.level,
        corner: `(${placement.corner.x},${placement.corner.z})`,
        lugCount: placement.lugCount,
        spacer: (placement.lugCount <= 2 ? 'double' : 'single') as 'double' | 'single',
        variant,
        hasLowerSupport: placement.hasLowerSupport,
        pontoonIds: Array.from(placement.pontoonIds),
      };
    })
    .sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      if (a.lugCount !== b.lugCount) return b.lugCount - a.lugCount;
      return a.corner.localeCompare(b.corner);
    });
}

function printScenarioReport(scenario: Scenario): void {
  const grid = buildGrid(scenario);
  const summaries = summarizeEdges(grid);

  console.log('='.repeat(72));
  console.log(scenario.name);
  console.log(scenario.description);
  console.log(`Pontoons: ${grid.pontoons.size}`);

  if (!summaries.length) {
    console.log('→ No edge hardware placements detected.\n');
    return;
  }

  const countsByLug = summaries.reduce<Record<number, number>>((acc, entry) => {
    acc[entry.lugCount] = (acc[entry.lugCount] ?? 0) + 1;
    return acc;
  }, {});

  console.log(
    `→ Edge connectors: ${summaries.length}  (lug breakdown: ${Object.entries(
      countsByLug,
    )
      .map(([lug, count]) => `${count}×${lug}lug`)
      .join(', ')})`,
  );

  for (const summary of summaries) {
    const spacerLabel =
      summary.spacer === 'double' ? 'Scheibe (doppelt)' : 'Einzel-Scheibe';
    const longLabel =
      summary.variant === 'long'
        ? summary.hasLowerSupport
          ? 'long w/ support'
          : 'long (!no support!)'
        : 'standard';

    console.log(
      `  • Level ${summary.level} corner ${summary.corner}: ${summary.lugCount} lugs → ${spacerLabel}, ${longLabel}`,
    );
    console.log(
      `    Pontoons: ${summary.pontoonIds.length ? summary.pontoonIds.join(', ') : 'n/a'}`,
    );
  }
  console.log();
}

function main() {
  scenarios.forEach(printScenarioReport);
}

main();
