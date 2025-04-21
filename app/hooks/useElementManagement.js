"use client";

import { useCallback } from "react";
import { TOOLS, ELEMENT_TYPES } from "../constants/grid";

/**
 * Custom hook for managing pontoon elements
 * @param {Function} isPositionOccupied - Function to check if a position is occupied
 * @param {number} waterLevel - Water level position
 * @param {number} levelHeight - Height between levels
 * @returns {Object} - Element management functions
 */
export function useElementManagement(
  isPositionOccupied,
  waterLevel,
  levelHeight
) {
  /**
   * Handles adding a single pontoon element
   * @param {Array} position - Click position [x, y, z]
   * @param {number} currentLevel - Current level
   * @param {Object} prevElements - Previous elements state
   * @returns {Object} - Updated elements object
   */
  const handleAddSinglePontoon = useCallback(
    (position, currentLevel, prevElements) => {
      if (
        isPositionOccupied(position[0], position[2], currentLevel, prevElements)
      ) {
        return prevElements;
      }

      const newElement = {
        position: [
          position[0],
          waterLevel + currentLevel * levelHeight,
          position[2],
        ],
        type: ELEMENT_TYPES.SINGLE,
      };

      return {
        ...prevElements,
        [currentLevel]: [...prevElements[currentLevel], newElement],
      };
    },
    [isPositionOccupied, waterLevel, levelHeight]
  );

  /**
   * Handles adding a double pontoon element
   * @param {Array} position - Click position [x, y, z]
   * @param {number} currentLevel - Current level
   * @param {Object} prevElements - Previous elements state
   * @param {number} gridWidth - Grid width
   * @returns {Object} - Updated elements object
   */
  const handleAddDoublePontoon = useCallback(
    (position, currentLevel, prevElements, gridWidth) => {
      if (position[0] >= gridWidth / 2 - 1) return prevElements;

      if (
        isPositionOccupied(
          position[0],
          position[2],
          currentLevel,
          prevElements
        ) ||
        isPositionOccupied(
          position[0] + 1,
          position[2],
          currentLevel,
          prevElements
        )
      ) {
        return prevElements;
      }

      const newElement = {
        position: [
          position[0],
          waterLevel + currentLevel * levelHeight,
          position[2],
        ],
        type: ELEMENT_TYPES.DOUBLE,
      };

      return {
        ...prevElements,
        [currentLevel]: [...prevElements[currentLevel], newElement],
      };
    },
    [isPositionOccupied, waterLevel, levelHeight]
  );

  /**
   * Handles deleting an element
   * @param {Array} position - Click position [x, y, z]
   * @param {number} currentLevel - Current level
   * @param {Object} prevElements - Previous elements state
   * @returns {Object} - Updated elements object
   */
  const handleDeleteElement = useCallback(
    (position, currentLevel, prevElements) => {
      return {
        ...prevElements,
        [currentLevel]: prevElements[currentLevel].filter((element) => {
          if (element.type === ELEMENT_TYPES.DOUBLE) {
            const elementStart = element.position[0];
            const elementEnd = elementStart + 1;
            return !(
              element.position[2] === position[2] &&
              position[0] >= elementStart &&
              position[0] <= elementEnd
            );
          } else {
            return !(
              element.position[0] === position[0] &&
              element.position[2] === position[2]
            );
          }
        }),
      };
    },
    []
  );

  /**
   * Main handler for cell click based on selected tool
   * @param {string} selectedTool - Currently selected tool
   * @param {Array} position - Click position [x, y, z]
   * @param {number} currentLevel - Current level
   * @param {Object} prevElements - Previous elements state
   * @param {number} gridWidth - Grid width
   * @returns {Object} - Updated elements object or null if no change
   */
  const handleElementAction = useCallback(
    (selectedTool, position, currentLevel, prevElements, gridWidth) => {
      switch (selectedTool) {
        case TOOLS.SINGLE_PONTOON:
          return handleAddSinglePontoon(position, currentLevel, prevElements);
        case TOOLS.DOUBLE_PONTOON:
          return handleAddDoublePontoon(
            position,
            currentLevel,
            prevElements,
            gridWidth
          );
        case TOOLS.DELETE_TOOL:
          return handleDeleteElement(position, currentLevel, prevElements);
        default:
          return null;
      }
    },
    [handleAddSinglePontoon, handleAddDoublePontoon, handleDeleteElement]
  );

  return {
    handleElementAction,
  };
}

export default useElementManagement;
