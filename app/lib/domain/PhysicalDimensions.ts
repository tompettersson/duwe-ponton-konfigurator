/**
 * PhysicalDimensions - Value Object for Physical Measurements
 * 
 * Immutable representation of physical dimensions in millimeters
 * Provides precise measurements for manufacturing accuracy
 */

export class PhysicalDimensions {
  readonly widthMM: number;   // Width in millimeters
  readonly heightMM: number;  // Height in millimeters  
  readonly depthMM: number;   // Depth in millimeters

  constructor(widthMM: number, heightMM: number, depthMM: number) {
    // Validate dimensions
    if (widthMM <= 0 || heightMM <= 0 || depthMM <= 0) {
      throw new Error('Physical dimensions must be positive');
    }

    if (!Number.isFinite(widthMM) || !Number.isFinite(heightMM) || !Number.isFinite(depthMM)) {
      throw new Error('Physical dimensions must be finite numbers');
    }

    this.widthMM = widthMM;
    this.heightMM = heightMM;
    this.depthMM = depthMM;
  }

  /**
   * Get width in meters
   */
  get widthM(): number {
    return this.widthMM / 1000;
  }

  /**
   * Get height in meters
   */
  get heightM(): number {
    return this.heightMM / 1000;
  }

  /**
   * Get depth in meters
   */
  get depthM(): number {
    return this.depthMM / 1000;
  }

  /**
   * Calculate volume in cubic millimeters
   */
  get volumeMM3(): number {
    return this.widthMM * this.heightMM * this.depthMM;
  }

  /**
   * Calculate volume in cubic meters
   */
  get volumeM3(): number {
    return this.volumeMM3 / (1000 * 1000 * 1000);
  }

  /**
   * Calculate surface area in square millimeters
   */
  get surfaceAreaMM2(): number {
    return 2 * (
      this.widthMM * this.heightMM +
      this.widthMM * this.depthMM +
      this.heightMM * this.depthMM
    );
  }

  /**
   * Calculate surface area in square meters
   */
  get surfaceAreaM2(): number {
    return this.surfaceAreaMM2 / (1000 * 1000);
  }

  /**
   * Scale dimensions by factor
   */
  scale(factor: number): PhysicalDimensions {
    if (factor <= 0) {
      throw new Error('Scale factor must be positive');
    }
    
    return new PhysicalDimensions(
      this.widthMM * factor,
      this.heightMM * factor,
      this.depthMM * factor
    );
  }

  /**
   * Check if dimensions fit within bounds
   */
  fitsWithin(bounds: PhysicalDimensions): boolean {
    return this.widthMM <= bounds.widthMM &&
           this.heightMM <= bounds.heightMM &&
           this.depthMM <= bounds.depthMM;
  }

  /**
   * Check equality with tolerance for manufacturing precision
   */
  equals(other: PhysicalDimensions, toleranceMM: number = 0.1): boolean {
    return Math.abs(this.widthMM - other.widthMM) <= toleranceMM &&
           Math.abs(this.heightMM - other.heightMM) <= toleranceMM &&
           Math.abs(this.depthMM - other.depthMM) <= toleranceMM;
  }

  /**
   * Get string representation
   */
  toString(): string {
    return `${this.widthMM}mm × ${this.heightMM}mm × ${this.depthMM}mm`;
  }

  /**
   * Get string representation in meters
   */
  toStringMeters(): string {
    return `${this.widthM.toFixed(3)}m × ${this.heightM.toFixed(3)}m × ${this.depthM.toFixed(3)}m`;
  }

  /**
   * Create from meters
   */
  static fromMeters(widthM: number, heightM: number, depthM: number): PhysicalDimensions {
    return new PhysicalDimensions(
      widthM * 1000,
      heightM * 1000,
      depthM * 1000
    );
  }

  /**
   * Standard pontoon dimensions
   */
  static readonly SINGLE_PONTOON = new PhysicalDimensions(500, 400, 500); // 0.5m × 0.4m × 0.5m
  static readonly DOUBLE_PONTOON = new PhysicalDimensions(1000, 400, 500); // 1.0m × 0.4m × 0.5m

  /**
   * Create JSON representation
   */
  toJSON(): { widthMM: number; heightMM: number; depthMM: number } {
    return {
      widthMM: this.widthMM,
      heightMM: this.heightMM,
      depthMM: this.depthMM
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: { widthMM: number; heightMM: number; depthMM: number }): PhysicalDimensions {
    return new PhysicalDimensions(json.widthMM, json.heightMM, json.depthMM);
  }
}