import { PONTOON_TYPES, gridToWorld, getConnectionPoints, BASE_UNIT } from '../constants/units.js';

// Clean PontoonElement class with full dimensional awareness
export class PontoonElement {
  constructor(type, gridX, gridZ, level = 0, color = 'blue', rotation = 0) {
    this.type = type;
    this.gridPosition = { x: gridX, z: gridZ };
    this.level = level;
    this.color = color;
    this.rotation = rotation; // 0, 90, 180, 270 degrees
    
    // Dimensional awareness - element knows its exact size
    this.gridSize = PONTOON_TYPES[type].gridSize;
    this.physicalSize = PONTOON_TYPES[type].physicalSize;
    
    // Calculate world position (mathematical, no offsets)
    this.worldPosition = this.calculateWorldPosition();
    this.boundingBox = this.calculateBoundingBox();
    this.connectionPoints = this.calculateConnectionPoints();
    
    // Unique identifier for React keys
    this.id = `${type}_${gridX}_${gridZ}_${level}_${Date.now()}`;
  }
  
  calculateWorldPosition() {
    const basePos = gridToWorld(this.gridPosition.x, this.gridPosition.z, this.level);
    
    // Center the element on its grid position
    return {
      x: basePos.x + (this.physicalSize.width / 2),
      y: basePos.y + (this.physicalSize.height / 2),
      z: basePos.z + (this.physicalSize.depth / 2)
    };
  }
  
  calculateBoundingBox() {
    const halfWidth = this.physicalSize.width / 2;
    const halfDepth = this.physicalSize.depth / 2;
    const halfHeight = this.physicalSize.height / 2;
    
    return {
      min: {
        x: this.worldPosition.x - halfWidth,
        y: this.worldPosition.y - halfHeight,
        z: this.worldPosition.z - halfDepth
      },
      max: {
        x: this.worldPosition.x + halfWidth,
        y: this.worldPosition.y + halfHeight,
        z: this.worldPosition.z + halfDepth
      }
    };
  }
  
  calculateConnectionPoints() {
    return getConnectionPoints(this.type, this.gridPosition.x, this.gridPosition.z);
  }
  
  // Check if this element occupies a specific grid cell
  occupiesCell(gridX, gridZ) {
    // Handle rotation (for future expansion)
    let width = this.gridSize.width;
    let depth = this.gridSize.depth;
    
    if (this.rotation === 90 || this.rotation === 270) {
      [width, depth] = [depth, width];
    }
    
    return gridX >= this.gridPosition.x && 
           gridX < this.gridPosition.x + width &&
           gridZ >= this.gridPosition.z && 
           gridZ < this.gridPosition.z + depth;
  }
  
  // Get all grid cells occupied by this element
  getOccupiedCells() {
    const cells = [];
    let width = this.gridSize.width;
    let depth = this.gridSize.depth;
    
    if (this.rotation === 90 || this.rotation === 270) {
      [width, depth] = [depth, width];
    }
    
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        cells.push({
          x: this.gridPosition.x + x,
          z: this.gridPosition.z + z,
          level: this.level
        });
      }
    }
    
    return cells;
  }
  
  // Check if this element can be placed at its position
  canBePlaced(existingElements = []) {
    const occupiedCells = this.getOccupiedCells();
    
    for (const cell of occupiedCells) {
      // Check for collision with existing elements
      for (const element of existingElements) {
        if (element.level === cell.level && element.occupiesCell(cell.x, cell.z)) {
          return false;
        }
      }
      
      // Check support requirement for upper levels
      if (cell.level > 0) {
        const hasSupport = existingElements.some(element => 
          element.level === cell.level - 1 && element.occupiesCell(cell.x, cell.z)
        );
        if (!hasSupport) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  // Get Three.js geometry for rendering
  getGeometry() {
    return {
      width: this.physicalSize.width,
      height: this.physicalSize.height,
      depth: this.physicalSize.depth
    };
  }
  
  // Clone this element at a new position
  clone(newGridX, newGridZ, newLevel = this.level) {
    return new PontoonElement(
      this.type,
      newGridX,
      newGridZ,
      newLevel,
      this.color,
      this.rotation
    );
  }
  
  // Rotate element (returns new rotated element)
  rotate(degrees = 90) {
    const newRotation = (this.rotation + degrees) % 360;
    return new PontoonElement(
      this.type,
      this.gridPosition.x,
      this.gridPosition.z,
      this.level,
      this.color,
      newRotation
    );
  }
}