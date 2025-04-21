"use client";

import { useCallback } from "react";
import { ELEMENT_TYPES } from "../constants/grid";

/**
 * Custom hook for grid position management
 */
export function useGridPositions() {
  /**
   * Checks if a position is occupied by an element
   * @param {number} x - X coordinate
   * @param {number} z - Z coordinate
   * @param {number} level - Current level
   * @param {Object} elements - Elements by level
   * @returns {boolean} - True if position is occupied
   */
  const isPositionOccupied = useCallback((x, z, level, elements) => {
    return elements[level]?.some((element) => {
      if (element.type === ELEMENT_TYPES.DOUBLE) {
        const elementStart = element.position[0];
        const elementEnd = elementStart + 1;
        return (
          element.position[2] === z && x >= elementStart && x <= elementEnd
        );
      } else {
        return element.position[0] === x && element.position[2] === z;
      }
    });
  }, []);

  /**
   * Creates grid elements for a given grid size
   * @param {Object} gridSize - Grid dimensions
   * @param {Function} handleCellClick - Cell click handler
   * @param {string} selectedTool - Current selected tool
   * @param {Object} elements - Elements by level
   * @param {number} currentLevel - Current level
   * @param {number} levelHeight - Height between levels
   * @returns {Array} - Array of grid elements
   */
  const createGridElements = useCallback(
    (
      gridSize,
      handleCellClick,
      selectedTool,
      elements,
      currentLevel,
      levelHeight
    ) => {
      return Array.from(
        { length: gridSize.width * gridSize.depth },
        (_, index) => {
          const x = (index % gridSize.width) - gridSize.width / 2;
          const z = Math.floor(index / gridSize.width) - gridSize.depth / 2;
          return {
            key: `${x},0,${z}`,
            position: [x + 0.5, currentLevel * levelHeight, z + 0.5],
            onCellClick: handleCellClick,
            selectedTool,
            elements: elements[currentLevel],
            currentLevel,
          };
        }
      );
    },
    []
  );

  /**
   * Flattens elements from all levels for rendering
   * @param {Object} elements - Elements by level
   * @param {number} currentLevel - Current level
   * @returns {Array} - Flattened elements array
   */
  const flattenElements = useCallback((elements, currentLevel) => {
    return Object.entries(elements).flatMap(([level, levelElements]) =>
      levelElements.map((element) => ({
        ...element,
        isCurrentLevel: parseInt(level) === currentLevel,
      }))
    );
  }, []);

  return {
    isPositionOccupied,
    createGridElements,
    flattenElements,
  };
}

export default useGridPositions;
