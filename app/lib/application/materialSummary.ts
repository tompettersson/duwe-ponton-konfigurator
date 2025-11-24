import { CoordinateCalculator, Grid, PontoonColor, PontoonType, getPontoonColorConfig, getPontoonTypeConfig } from '../domain';
import { computeConnectorPlacements, determineConnectorVariant } from '../ui/connectorPlanner';

export type MaterialCategory = 'Pontoons' | 'Connectors' | 'Edge Hardware' | 'Accessories';

export interface MaterialSummaryItem {
  id: string;
  label: string;
  count: number;
  category: MaterialCategory;
}

export function calculateMaterialSummary(grid: Grid): MaterialSummaryItem[] {
  const items: MaterialSummaryItem[] = [];

  // Pontoon counts grouped by type + color
  const pontoonCounts = new Map<string, { type: PontoonType; color: PontoonColor; count: number }>();
  for (const pontoon of grid.pontoons.values()) {
    const key = `${pontoon.type}:${pontoon.color}`;
    const entry = pontoonCounts.get(key) ?? { type: pontoon.type, color: pontoon.color, count: 0 };
    entry.count += 1;
    pontoonCounts.set(key, entry);
  }

  for (const value of pontoonCounts.values()) {
    const typeConfig = getPontoonTypeConfig(value.type);
    const colorConfig = getPontoonColorConfig(value.color);
    items.push({
      id: `pontoon-${value.type}-${value.color}`,
      label: `${typeConfig.displayName} (${colorConfig.name})`,
      count: value.count,
      category: 'Pontoons'
    });
  }

  if (grid.pontoons.size === 0) {
    return items;
  }

  const calculator = new CoordinateCalculator();
  const connectorPlacements = computeConnectorPlacements(grid, { calculator });

  let standardConnectorCount = 0;
  let longConnectorCount = 0;
  const edgePlacements: typeof connectorPlacements = [];

  for (const placement of connectorPlacements) {
    if (placement.lugCount >= 4) {
      const variant = determineConnectorVariant(placement);
      if (variant === 'long') {
        longConnectorCount += 1;
      } else {
        standardConnectorCount += 1;
      }
    } else if (placement.lugCount >= 1) {
      edgePlacements.push(placement);
    }
  }

  if (standardConnectorCount > 0) {
    items.push({
      id: 'connector-standard',
      label: 'Standard-Verbinder',
      count: standardConnectorCount,
      category: 'Connectors'
    });
  }

  if (longConnectorCount > 0) {
    items.push({
      id: 'connector-long',
      label: 'Langer Verbinder',
      count: longConnectorCount,
      category: 'Connectors'
    });
  }

  if (edgePlacements.length > 0) {
    const boltCount = edgePlacements.length;
    const doubleWasherCount = edgePlacements.reduce(
      (count, placement) =>
        count +
        placement.spacers.filter(spacer => spacer.type === 'double').length,
      0
    );
    const singleWasherCount = edgePlacements.reduce(
      (count, placement) =>
        count +
        placement.spacers.filter(spacer => spacer.type === 'single').length,
      0
    );

    items.push({
      id: 'edge-bolt',
      label: 'Randverbinder (Bolzen)',
      count: boltCount,
      category: 'Edge Hardware'
    });

    if (doubleWasherCount > 0) {
      items.push({
        id: 'edge-washer-double',
        label: 'Distanzscheibe (doppelt)',
        count: doubleWasherCount,
        category: 'Edge Hardware'
      });
    }
 
    if (singleWasherCount > 0) {
      items.push({
        id: 'edge-washer-single',
        label: 'Distanzscheibe (einfach)',
        count: singleWasherCount,
        category: 'Edge Hardware'
      });
    }

    items.push({
      id: 'edge-nut',
      label: 'Randverbinder-Mutter',
      count: boltCount,
      category: 'Edge Hardware'
    });
  }

  if (grid.pontoons.size > 0) {
    items.push({
      id: 'drain-plug',
      label: 'Drain-/Flutschraube',
      count: grid.pontoons.size,
      category: 'Accessories'
    });
  }

  return items;
}
