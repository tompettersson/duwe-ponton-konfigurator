import { PontoonElement } from './PontoonElement.js';
import { BASE_UNIT, PONTOON_TYPES } from '../constants/units.js';

/**
 * Mathematical Collision Detection - No trial-and-error, pure grid logic
 * Every element knows its exact grid footprint and position
 */

export class CollisionDetection {
  constructor(elements = []) {
    this.elements = elements.map(el => 
      el instanceof PontoonElement ? el : this.convertLegacyElement(el)
    );
  }

  // Convert legacy element format to PontoonElement
  convertLegacyElement(element) {
    const gridPos = {
      x: Math.round(element.position.x / BASE_UNIT.width),
      z: Math.round(element.position.z / BASE_UNIT.depth)
    };
    
    const type = element.type === 'DOUBLE' ? 'double' : 'single';
    const level = element.level || Math.round(element.position.y / BASE_UNIT.height);
    
    return new PontoonElement(
      type,
      gridPos.x,
      gridPos.z,
      level,
      element.color || 'blue'
    );
  }

  // Check if a grid cell is occupied by any element
  isCellOccupied(gridX, gridZ, level) {
    return this.elements.some(element => 
      element.level === level && element.occupiesCell(gridX, gridZ)
    );
  }

  // Check if a grid cell has structural support (element below)
  hasCellSupport(gridX, gridZ, level) {
    // Ground level and below always have support
    if (level <= 0) return true;
    
    // Check if there's any element on the level below that covers this cell
    return this.elements.some(element => 
      element.level === level - 1 && element.occupiesCell(gridX, gridZ)
    );
  }

  // Check if a new element can be placed at a specific position
  canPlaceElement(type, gridX, gridZ, level, rotation = 0) {
    // Create a temporary element to check placement
    const testElement = new PontoonElement(type, gridX, gridZ, level, 'blue', rotation);
    
    // Get all cells this element would occupy
    const occupiedCells = testElement.getOccupiedCells();
    
    // Check each cell for conflicts and support
    for (const cell of occupiedCells) {
      // Check for collision with existing elements
      if (this.isCellOccupied(cell.x, cell.z, cell.level)) {
        return { canPlace: false, reason: 'collision', cell };
      }
      
      // Check support requirement for upper levels
      if (!this.hasCellSupport(cell.x, cell.z, cell.level)) {
        return { canPlace: false, reason: 'no_support', cell };
      }
    }
    
    return { canPlace: true, occupiedCells };
  }

  // Add a new element to the collision system
  addElement(element) {
    const pontoonElement = element instanceof PontoonElement ? 
      element : this.convertLegacyElement(element);
    
    // Verify placement is valid
    const placement = this.canPlaceElement(
      pontoonElement.type,
      pontoonElement.gridPosition.x,
      pontoonElement.gridPosition.z,
      pontoonElement.level,
      pontoonElement.rotation
    );
    
    if (placement.canPlace) {
      this.elements.push(pontoonElement);
      return { success: true, element: pontoonElement };
    } else {
      return { success: false, reason: placement.reason, cell: placement.cell };
    }
  }

  // Remove an element from the collision system
  removeElement(elementId) {
    const index = this.elements.findIndex(el => el.id === elementId);
    if (index !== -1) {
      const removed = this.elements.splice(index, 1)[0];
      return { success: true, element: removed };
    }
    return { success: false, reason: 'not_found' };
  }

  // Remove element at specific grid position and level
  removeElementAt(gridX, gridZ, level) {
    const element = this.elements.find(el => 
      el.level === level && el.occupiesCell(gridX, gridZ)
    );
    
    if (element) {
      return this.removeElement(element.id);
    }
    
    return { success: false, reason: 'no_element_at_position' };
  }

  // Get all elements at a specific level
  getElementsAtLevel(level) {
    return this.elements.filter(el => el.level === level);
  }

  // Get element at specific grid position
  getElementAt(gridX, gridZ, level) {
    return this.elements.find(el => 
      el.level === level && el.occupiesCell(gridX, gridZ)
    );
  }

  // Check if removing an element would cause support issues
  canRemoveElement(elementId) {
    const element = this.elements.find(el => el.id === elementId);
    if (!element) return { canRemove: false, reason: 'not_found' };
    
    const occupiedCells = element.getOccupiedCells();
    
    // Check if any elements above depend on this element for support
    for (const cell of occupiedCells) {
      const elementsAbove = this.elements.filter(el => 
        el.level === cell.level + 1 && 
        el.occupiesCell(cell.x, cell.z) && 
        el.id !== elementId
      );
      
      for (const elementAbove of elementsAbove) {
        // Check if element above would still have support after removal
        const aboveOccupiedCells = elementAbove.getOccupiedCells();
        const wouldHaveSupport = aboveOccupiedCells.every(aboveCell => 
          // Either this cell isn't affected by removal, or has other support
          !element.occupiesCell(aboveCell.x, aboveCell.z) ||
          this.elements.some(supportEl => 
            supportEl.level === aboveCell.level - 1 &&
            supportEl.id !== elementId &&
            supportEl.occupiesCell(aboveCell.x, aboveCell.z)
          )
        );
        
        if (!wouldHaveSupport) {
          return { 
            canRemove: false, 
            reason: 'would_remove_support', 
            affectedElement: elementAbove 
          };
        }
      }
    }
    
    return { canRemove: true };
  }

  // Get collision debug information
  getDebugInfo() {
    return {
      elementCount: this.elements.length,
      elementsByLevel: this.elements.reduce((acc, el) => {
        acc[el.level] = (acc[el.level] || 0) + 1;
        return acc;
      }, {}),
      occupiedCells: this.elements.flatMap(el => 
        el.getOccupiedCells().map(cell => ({
          ...cell,
          elementId: el.id,
          elementType: el.type
        }))
      )
    };
  }

  // Export elements for persistence
  exportElements() {
    return this.elements.map(el => ({
      type: el.type,
      gridX: el.gridPosition.x,
      gridZ: el.gridPosition.z,
      level: el.level,
      color: el.color,
      rotation: el.rotation,
      id: el.id
    }));
  }

  // Clear all elements
  clear() {
    this.elements = [];
  }
}

// Factory function for easy usage
export function createCollisionDetection(elements = []) {
  return new CollisionDetection(elements);
}