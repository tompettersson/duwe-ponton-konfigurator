/**
 * Grid-Cell Abstraction Layer
 * 
 * Unified, simple Grid-Cell-based logic for all standard pontoon placement decisions.
 * Replaces complex mathematical precision with Minecraft-style "block-over-block" logic.
 */

export interface GridCell {
  x: number;
  y: number; // Level (0 = ground, 1 = first level above, etc.)
  z: number;
}

export type PontoonType = 'single' | 'double';

export interface GridCellState {
  pontoonId: string | null;
  pontoonType: PontoonType | null;
}

export class GridCellAbstraction {
  private cellStates: Map<string, GridCellState> = new Map();
  private gridSize: { width: number; height: number };

  constructor(gridSize: { width: number; height: number }) {
    this.gridSize = gridSize;
  }

  // ==========================================
  // CORE GRID-CELL LOGIC (Simple & Fast)
  // ==========================================

  /**
   * Check if a grid cell is occupied by any pontoon
   */
  isOccupied(cell: GridCell): boolean {
    const key = this.getCellKey(cell);
    const state = this.cellStates.get(key);
    return state?.pontoonId !== null;
  }

  /**
   * Check if a grid cell has structural support from the level below
   * MINECRAFT-STYLE: Block-over-block logic
   */
  hasSupport(cell: GridCell): boolean {
    // Ground level (Y=0) always has support
    if (cell.y <= 0) return true;

    // Level 1+ requires pontoon directly below
    const supportCell: GridCell = { x: cell.x, y: cell.y - 1, z: cell.z };
    return this.isOccupied(supportCell);
  }

  /**
   * Check if a pontoon can be placed at this grid cell
   * UNIFIED PLACEMENT LOGIC
   */
  canPlace(cell: GridCell, type: PontoonType): boolean {
    // Check bounds
    if (!this.isInBounds(cell, type)) return false;

    // Check if cell is already occupied
    if (this.isOccupied(cell)) return false;

    // For double pontoons, check both cells
    if (type === 'double') {
      const secondCell: GridCell = { x: cell.x + 1, y: cell.y, z: cell.z };
      if (!this.isInBounds(secondCell, 'single')) return false;
      if (this.isOccupied(secondCell)) return false;
      
      // Both cells need support
      if (!this.hasSupport(cell) || !this.hasSupport(secondCell)) return false;
    } else {
      // Single pontoon support check
      if (!this.hasSupport(cell)) return false;
    }

    return true;
  }

  // ==========================================
  // LEVEL-SPECIFIC QUERIES
  // ==========================================

  /**
   * Check if cell is occupied at specific level
   */
  isOccupiedAtLevel(cell: GridCell, level: number): boolean {
    return this.isOccupied({ x: cell.x, y: level, z: cell.z });
  }

  /**
   * Check if cell has support at specific level
   */
  hasSupportAtLevel(cell: GridCell, level: number): boolean {
    return this.hasSupport({ x: cell.x, y: level, z: cell.z });
  }

  // ==========================================
  // STATE MANAGEMENT (Simple Operations)
  // ==========================================

  /**
   * Occupy a grid cell with a pontoon
   */
  occupyCell(cell: GridCell, pontoonId: string, type: PontoonType): void {
    const key = this.getCellKey(cell);
    this.cellStates.set(key, { pontoonId, pontoonType: type });

    // For double pontoons, occupy second cell too
    if (type === 'double') {
      const secondCell: GridCell = { x: cell.x + 1, y: cell.y, z: cell.z };
      const secondKey = this.getCellKey(secondCell);
      this.cellStates.set(secondKey, { pontoonId, pontoonType: type });
    }
  }

  /**
   * Free a grid cell (remove pontoon)
   */
  freeCell(cell: GridCell): void {
    const key = this.getCellKey(cell);
    const state = this.cellStates.get(key);
    
    if (state?.pontoonType === 'double') {
      // Free both cells for double pontoon
      this.cellStates.delete(key);
      const secondCell: GridCell = { x: cell.x + 1, y: cell.y, z: cell.z };
      const secondKey = this.getCellKey(secondCell);
      this.cellStates.delete(secondKey);
    } else {
      this.cellStates.delete(key);
    }
  }

  /**
   * Get pontoon ID at specific grid cell
   */
  getPontoonAtCell(cell: GridCell): string | null {
    const key = this.getCellKey(cell);
    const state = this.cellStates.get(key);
    return state?.pontoonId || null;
  }

  /**
   * Get pontoon type at specific grid cell
   */
  getPontoonTypeAtCell(cell: GridCell): PontoonType | null {
    const key = this.getCellKey(cell);
    const state = this.cellStates.get(key);
    return state?.pontoonType || null;
  }

  // ==========================================
  // AREA OPERATIONS (Multi-Drop Support)
  // ==========================================

  /**
   * Get all occupied cells in an area
   */
  getOccupiedCellsInArea(startCell: GridCell, endCell: GridCell): GridCell[] {
    const occupied: GridCell[] = [];
    
    const minX = Math.min(startCell.x, endCell.x);
    const maxX = Math.max(startCell.x, endCell.x);
    const minZ = Math.min(startCell.z, endCell.z);
    const maxZ = Math.max(startCell.z, endCell.z);

    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const cell: GridCell = { x, y: startCell.y, z };
        if (this.isOccupied(cell)) {
          occupied.push(cell);
        }
      }
    }

    return occupied;
  }

  /**
   * Check if pontoons can be placed in area
   */
  canPlaceInArea(startCell: GridCell, endCell: GridCell, type: PontoonType): GridCell[] {
    const validCells: GridCell[] = [];
    
    const minX = Math.min(startCell.x, endCell.x);
    const maxX = Math.max(startCell.x, endCell.x);
    const minZ = Math.min(startCell.z, endCell.z);
    const maxZ = Math.max(startCell.z, endCell.z);

    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const cell: GridCell = { x, y: startCell.y, z };
        
        // For double pontoons, filter by even X positions
        if (type === 'double' && (x - minX) % 2 !== 0) {
          continue;
        }

        if (this.canPlace(cell, type)) {
          validCells.push(cell);
        }
      }
    }

    return validCells;
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Generate unique key for grid cell
   */
  private getCellKey(cell: GridCell): string {
    return `${cell.x},${cell.y},${cell.z}`;
  }

  /**
   * Check if cell is within grid bounds
   */
  private isInBounds(cell: GridCell, type: PontoonType): boolean {
    if (cell.x < 0 || cell.z < 0 || cell.y < 0) return false;
    if (cell.x >= this.gridSize.width || cell.z >= this.gridSize.height) return false;
    
    // For double pontoons, check second cell bounds
    if (type === 'double') {
      if (cell.x + 1 >= this.gridSize.width) return false;
    }

    return true;
  }

  /**
   * Get all occupied cells (for debugging/statistics)
   */
  getAllOccupiedCells(): Map<string, GridCellState> {
    return new Map(this.cellStates);
  }

  /**
   * Clear all cells (reset grid)
   */
  clearAllCells(): void {
    this.cellStates.clear();
  }

  /**
   * Get grid size
   */
  getGridSize(): { width: number; height: number } {
    return { ...this.gridSize };
  }
}