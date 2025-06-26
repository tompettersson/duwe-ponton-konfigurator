/**
 * PreviewService - Real-time Visual Feedback
 * 
 * Manages preview state and validation for instant user feedback
 * Ensures preview behavior exactly matches actual placement behavior
 */

import {
  Grid,
  GridPosition,
  PontoonType,
  PontoonColor,
  ValidationResult,
  PlacementValidator
} from '../domain';

export interface PreviewState {
  isActive: boolean;
  position: GridPosition | null;
  type: PontoonType | null;
  color: PontoonColor | null;
  isValid: boolean;
  validationErrors: string[];
  occupiedPositions: GridPosition[];
}

export interface MultiPreviewState {
  isActive: boolean;
  positions: Map<string, PreviewState>;
  totalValid: number;
  totalInvalid: number;
}

export interface HoverFeedback {
  canPlace: boolean;
  hasSupport: boolean;
  isOccupied: boolean;
  validationErrors: string[];
  supportDetails: {
    requiresSupport: boolean;
    supportPositions: GridPosition[];
    missingSupportPositions: GridPosition[];
  };
}

export class PreviewService {
  private validator: PlacementValidator;
  private currentPreview: PreviewState;
  private multiPreview: MultiPreviewState;

  constructor() {
    this.validator = new PlacementValidator();
    this.currentPreview = this.createEmptyPreview();
    this.multiPreview = this.createEmptyMultiPreview();
  }

  /**
   * Update single preview for hover feedback
   */
  updatePreview(
    grid: Grid,
    position: GridPosition | null,
    type: PontoonType,
    color: PontoonColor
  ): PreviewState {
    if (!position) {
      this.currentPreview = this.createEmptyPreview();
      return this.currentPreview;
    }

    // Validate placement
    const gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
    const validation = this.validator.canPlace(gridState, position, type);

    // Get occupied positions for this pontoon type
    const occupiedPositions = this.getOccupiedPositions(position, type);

    this.currentPreview = {
      isActive: true,
      position,
      type,
      color,
      isValid: validation.valid,
      validationErrors: validation.errors.map(e => e.message),
      occupiedPositions
    };

    return this.currentPreview;
  }

  /**
   * Get current preview state
   */
  getCurrentPreview(): PreviewState {
    return { ...this.currentPreview };
  }

  /**
   * Clear current preview
   */
  clearPreview(): void {
    this.currentPreview = this.createEmptyPreview();
  }

  /**
   * Update multi-preview for batch operations (multi-drop)
   */
  updateMultiPreview(
    grid: Grid,
    positions: GridPosition[],
    type: PontoonType,
    color: PontoonColor
  ): MultiPreviewState {
    const previewMap = new Map<string, PreviewState>();
    let validCount = 0;
    let invalidCount = 0;

    for (const position of positions) {
      const preview = this.createSinglePreview(grid, position, type, color);
      previewMap.set(position.toString(), preview);
      
      if (preview.isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
    }

    this.multiPreview = {
      isActive: positions.length > 0,
      positions: previewMap,
      totalValid: validCount,
      totalInvalid: invalidCount
    };

    return this.multiPreview;
  }

  /**
   * Get current multi-preview state
   */
  getMultiPreview(): MultiPreviewState {
    return {
      ...this.multiPreview,
      positions: new Map(this.multiPreview.positions)
    };
  }

  /**
   * Clear multi-preview
   */
  clearMultiPreview(): void {
    this.multiPreview = this.createEmptyMultiPreview();
  }

  /**
   * Get detailed hover feedback for UI display
   */
  getHoverFeedback(
    grid: Grid,
    position: GridPosition,
    type: PontoonType
  ): HoverFeedback {
    const gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
    
    // Basic checks
    const canPlace = grid.canPlacePontoon(position, type);
    const hasSupport = this.validator.hasSupport(gridState, position);
    const isOccupied = this.validator.isOccupied(gridState, position);
    
    // Detailed validation
    const validation = this.validator.canPlace(gridState, position, type);
    
    // Support analysis
    const supportDetails = this.analyzeSupportRequirements(grid, position, type);

    return {
      canPlace,
      hasSupport,
      isOccupied,
      validationErrors: validation.errors.map(e => e.message),
      supportDetails
    };
  }

  /**
   * Check if preview exactly matches placement validation
   * Critical for preventing hover/click discrepancies
   */
  validatePreviewAccuracy(
    grid: Grid,
    position: GridPosition,
    type: PontoonType
  ): {
    previewMatches: boolean;
    previewResult: boolean;
    placementResult: boolean;
    discrepancies: string[];
  } {
    // Get preview result
    const preview = this.createSinglePreview(grid, position, type, PontoonColor.BLUE);
    const previewResult = preview.isValid;

    // Get actual placement result
    const placementResult = grid.canPlacePontoon(position, type);

    // Check for discrepancies
    const discrepancies: string[] = [];
    
    if (previewResult !== placementResult) {
      discrepancies.push(
        `Preview says ${previewResult ? 'valid' : 'invalid'}, ` +
        `placement says ${placementResult ? 'valid' : 'invalid'}`
      );
    }

    return {
      previewMatches: previewResult === placementResult,
      previewResult,
      placementResult,
      discrepancies
    };
  }

  /**
   * Get all positions that would be occupied by pontoon type
   */
  private getOccupiedPositions(position: GridPosition, type: PontoonType): GridPosition[] {
    // This matches the logic in Pontoon.getOccupiedPositions()
    const positions: GridPosition[] = [];
    
    if (type === PontoonType.SINGLE) {
      positions.push(position);
    } else if (type === PontoonType.DOUBLE) {
      positions.push(position);
      positions.push(position.moveBy(1, 0, 0)); // Second cell for double pontoon
    }

    return positions;
  }

  /**
   * Create single preview state
   */
  private createSinglePreview(
    grid: Grid,
    position: GridPosition,
    type: PontoonType,
    color: PontoonColor
  ): PreviewState {
    const gridState = { pontoons: grid.pontoons, gridDimensions: grid.dimensions };
    const validation = this.validator.canPlace(gridState, position, type);
    const occupiedPositions = this.getOccupiedPositions(position, type);

    return {
      isActive: true,
      position,
      type,
      color,
      isValid: validation.valid,
      validationErrors: validation.errors.map(e => e.message),
      occupiedPositions
    };
  }

  /**
   * Analyze support requirements for detailed feedback
   */
  private analyzeSupportRequirements(
    grid: Grid,
    position: GridPosition,
    type: PontoonType
  ): {
    requiresSupport: boolean;
    supportPositions: GridPosition[];
    missingSupportPositions: GridPosition[];
  } {
    const requiresSupport = position.y > 0; // Level 0 doesn't need support
    const supportPositions: GridPosition[] = [];
    const missingSupportPositions: GridPosition[] = [];

    if (requiresSupport) {
      const occupiedPositions = this.getOccupiedPositions(position, type);
      
      for (const pos of occupiedPositions) {
        const supportPos = pos.getBelow();
        supportPositions.push(supportPos);
        
        if (!grid.hasPontoonAt(supportPos)) {
          missingSupportPositions.push(supportPos);
        }
      }
    }

    return {
      requiresSupport,
      supportPositions,
      missingSupportPositions
    };
  }

  /**
   * Create empty preview state
   */
  private createEmptyPreview(): PreviewState {
    return {
      isActive: false,
      position: null,
      type: null,
      color: null,
      isValid: false,
      validationErrors: [],
      occupiedPositions: []
    };
  }

  /**
   * Create empty multi-preview state
   */
  private createEmptyMultiPreview(): MultiPreviewState {
    return {
      isActive: false,
      positions: new Map(),
      totalValid: 0,
      totalInvalid: 0
    };
  }

  /**
   * Get preview statistics for debugging
   */
  getPreviewStats(): {
    singlePreview: {
      isActive: boolean;
      isValid: boolean;
      errorCount: number;
    };
    multiPreview: {
      isActive: boolean;
      totalPositions: number;
      validCount: number;
      invalidCount: number;
    };
  } {
    return {
      singlePreview: {
        isActive: this.currentPreview.isActive,
        isValid: this.currentPreview.isValid,
        errorCount: this.currentPreview.validationErrors.length
      },
      multiPreview: {
        isActive: this.multiPreview.isActive,
        totalPositions: this.multiPreview.positions.size,
        validCount: this.multiPreview.totalValid,
        invalidCount: this.multiPreview.totalInvalid
      }
    };
  }
}