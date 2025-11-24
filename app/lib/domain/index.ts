/**
 * Domain Layer - Index
 * 
 * Clean exports for all domain components
 * Provides single entry point for domain layer access
 */

// Value Objects
export { GridPosition } from './GridPosition';
export { PhysicalDimensions } from './PhysicalDimensions';

// Types and Enums
export {
  PontoonType,
  PontoonColor,
  Rotation,
  ValidationErrorType,
  PONTOON_TYPE_CONFIGS,
  PONTOON_COLOR_CONFIGS,
  PONTOON_LUG_CONFIGS,
  getPontoonTypeConfig,
  getPontoonColorConfig,
  isValidPontoonType,
  isValidPontoonColor
} from './PontoonTypes';

export type {
  PontoonId,
  GridOffset,
  PhysicalPosition,
  WorldPosition,
  ScreenPosition,
  ValidationResult,
  ValidationError,
  GridDimensions,
  PontoonTypeConfig
} from './PontoonTypes';

// Entities
export { Pontoon } from './Pontoon';
export { Grid } from './Grid';

// Services
export { CoordinateCalculator } from './CoordinateCalculator';
export { PlacementValidator } from './PlacementValidator';
export type { GridState } from './PlacementValidator';

// Re-export common constants
export const DOMAIN_CONSTANTS = {
  CELL_SIZE_MM: 500,
  PONTOON_HEIGHT_MM: 400,
  PRECISION_FACTOR: 1000,
  DEFAULT_GRID_SIZE: 50,
  DEFAULT_LEVELS: 3
} as const;