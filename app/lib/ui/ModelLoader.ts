/**
 * ModelLoader - 3D Model Loading and Management
 * 
 * Handles loading of OBJ/MTL models with proper centering and scaling
 * for integration with the grid-based pontoon system
 */

import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

export interface ModelInfo {
  model: THREE.Group;
  dimensions: THREE.Vector3;
  center: THREE.Vector3;
  originalScale: number;
  meshCount?: number;
  inferredType?: 'single' | 'double' | 'unknown';
}

export class ModelLoader {
  private modelCache: Map<string, ModelInfo> = new Map();
  
  /**
   * Ensure the model's UP axis matches Three.js (Y-up) such that the
   * real-world pontoon height is aligned to the Y dimension. Also recenters
   * the model at the origin for easier placement and computes fresh bounds.
   *
   * Strategy: determine which axis currently represents the smallest extent
   * (expected to be ~400mm after scaling) and rotate the group so that this
   * axis maps to Y. Then re-center the model.
   */
  private alignYUpAndCenter(model: THREE.Group): { dimensions: THREE.Vector3; center: THREE.Vector3 } {
    // Compute initial bounds
    let box = new THREE.Box3().setFromObject(model);
    let size = box.getSize(new THREE.Vector3());
    
    // Identify smallest axis (pontoon height ~ 400mm, width/depth >= 500mm)
    const axes: Array<{ key: 'x'|'y'|'z'; value: number }> = [
      { key: 'x', value: size.x },
      { key: 'y', value: size.y },
      { key: 'z', value: size.z }
    ];
    axes.sort((a,b) => a.value - b.value);
    const smallest = axes[0].key;

    // Rotate so that the smallest axis becomes Y
    // - If smallest is X: rotate +90° around Z → X maps to Y
    // - If smallest is Z: rotate -90° around X → Z maps to Y
    if (smallest === 'x') {
      model.rotateZ(Math.PI / 2);
    } else if (smallest === 'z') {
      model.rotateX(-Math.PI / 2);
    }

    // Recompute bounds after rotation so we can measure the geometry
    box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const dimensions = box.getSize(new THREE.Vector3());
    
    // Reset group transform to origin – we apply the offset explicitly during placement
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);
    
    // Return updated metrics
    return { dimensions, center };
  }
  
  /**
   * Load the double pontoon model with materials (legacy fc path)
   */
  async loadDoublePontoon(): Promise<ModelInfo> {
    // Check cache
    if (this.modelCache.has('double-pontoon')) {
      return this.modelCache.get('double-pontoon')!;
    }
    
    try {
      // Load materials first
      const mtlLoader = new MTLLoader();
      const materials = await mtlLoader.loadAsync('/3d/fc/Ponton.mtl');
      materials.preload();
      
      // Load OBJ with materials
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      const model = await objLoader.loadAsync('/3d/fc/Ponton.obj');
      
      // Align orientation (Y-up) and center at origin, then measure
      const { dimensions, center } = this.alignYUpAndCenter(model);

      // Log analysis for debugging
      console.log('Double Pontoon Model Analysis:');
      console.log('- Dimensions (mm):', dimensions);
      console.log('- Center:', center);
      console.log('- Width:', dimensions.x, 'mm');
      console.log('- Height:', dimensions.y, 'mm');
      console.log('- Depth:', dimensions.z, 'mm');
      
      // Create model info
      const modelInfo: ModelInfo = {
        model,
        dimensions,
        center,
        originalScale: 1,
        meshCount: this.countMeshes(model),
        inferredType: this.inferTypeFromDimensions(dimensions)
      };
      
      // Cache for reuse
      this.modelCache.set('double-pontoon', modelInfo);
      
      return modelInfo;
    } catch (error) {
      console.error('Failed to load double pontoon model:', error);
      throw error;
    }
  }
  
  /**
   * Load the single pontoon model (OBJ only, no MTL)
   */
  async loadSinglePontoon(): Promise<ModelInfo> {
    if (this.modelCache.has('single-pontoon')) {
      return this.modelCache.get('single-pontoon')!;
    }
    try {
      const objLoader = new OBJLoader();
      // New models placed under /public/3d/neu
      const model = await objLoader.loadAsync('/3d/neu/Ponton_single.obj');
      
      // Align orientation (Y-up) and center at origin
      const { dimensions, center } = this.alignYUpAndCenter(model);
      
      const info: ModelInfo = {
        model,
        dimensions,
        center,
        originalScale: 1,
        meshCount: this.countMeshes(model),
        inferredType: this.inferTypeFromDimensions(dimensions)
      };
      this.modelCache.set('single-pontoon', info);
      return info;
    } catch (error) {
      console.error('Failed to load single pontoon model:', error);
      throw error;
    }
  }

  /** Quick heuristic: estimate SINGLE vs DOUBLE from X/Z aspect ratio */
  private inferTypeFromDimensions(dim: THREE.Vector3): 'single' | 'double' | 'unknown' {
    const a = Math.max(dim.x, dim.z);
    const b = Math.min(dim.x, dim.z);
    const ratio = a / (b || 1);
    if (!isFinite(ratio)) return 'unknown';
    if (ratio > 1.6) return 'double';
    if (ratio > 0.8 && ratio < 1.25) return 'single';
    return 'unknown';
  }

  /** Count meshes in group */
  private countMeshes(group: THREE.Group): number {
    let count = 0;
    group.traverse((obj: any) => {
      if (obj && obj.isMesh) count++;
    });
    return count;
  }
  
  /**
   * Create a clone of a loaded model for placement
   */
  cloneModel(modelInfo: ModelInfo): THREE.Group {
    return modelInfo.model.clone();
  }
  
  /**
   * Calculate scale factor to fit model into grid cell
   * Grid cell is 500mm, model dimensions are numeric (unitless).
   *
   * NOTE: This method scales using the model's WIDTH. If the model's width
   * includes corner overhangs/ears (as with pontoons), this will force the
   * entire bounding box to the target width which makes the body slightly
   * too small. Prefer calculateScaleFactorByHeight() for pontoons.
   */
  calculateScaleFactor(modelInfo: ModelInfo, targetWidth: number = 1000): number {
    // Normalize purely by numeric width regardless of authoring units.
    // We want final world width in meters = targetWidth(mm) / 1000.
    // scale = (targetMeters) / rawWidth
    const rawWidth = modelInfo.dimensions.x; // OBJ numeric width (unitless in Three.js)
    const targetMeters = targetWidth / 1000;
    const scaleFactor = targetMeters / rawWidth;

    console.log('Scale calculation (unit-agnostic):', {
      rawWidth,
      targetMeters,
      scaleFactor
    });

    return scaleFactor;
  }

  /**
   * Calculate scale factor using HEIGHT as the reference dimension.
   *
   * Pontoon body height is a precise, known value (400mm). Using height
   * avoids the ambiguity that width/depth may include corner overhangs
   * used for connectors. This produces physically correct scaling so the
   * model naturally exceeds the grid footprint by exactly its real
   * overhang amount.
   */
  calculateScaleFactorByHeight(modelInfo: ModelInfo, targetHeightMM: number = 400): number {
    const rawHeight = modelInfo.dimensions.y; // numeric height from OBJ
    const targetMeters = targetHeightMM / 1000; // meters in world units
    const scaleFactor = targetMeters / rawHeight;

    console.log('Scale calculation from HEIGHT:', {
      rawHeight,
      targetMeters,
      scaleFactor
    });

    return scaleFactor;
  }

  /**
   * After choosing a scale factor, compute the precise overhang beyond the
   * ideal grid footprint. Returns per-side overhang in millimeters.
   */
  computeOverhang(
    modelInfo: ModelInfo,
    opts: { targetWidthMM: number; targetDepthMM: number; scaleFactor: number }
  ): { overhangXPerSideMM: number; overhangZPerSideMM: number; scaled: { widthMM: number; depthMM: number; heightMM: number } } {
    const { targetWidthMM, targetDepthMM, scaleFactor } = opts;

    // Scale raw dimensions to world meters then convert to mm for reporting
    const scaled = modelInfo.dimensions.clone().multiplyScalar(scaleFactor);
    const widthMM = scaled.x * 1000;
    const depthMM = scaled.z * 1000;
    const heightMM = scaled.y * 1000;

    const overhangXPerSideMM = Math.max(0, (widthMM - targetWidthMM) / 2);
    const overhangZPerSideMM = Math.max(0, (depthMM - targetDepthMM) / 2);

    const result = {
      overhangXPerSideMM,
      overhangZPerSideMM,
      scaled: { widthMM, depthMM, heightMM }
    };

    console.log('Computed pontoon overhang:', result);
    return result;
  }
  
  /**
   * Apply proper scaling and positioning to a model instance
   */
  prepareModelForGrid(
    model: THREE.Group,
    gridPosition: THREE.Vector3,
    modelInfo: ModelInfo,
    scaleFactor: number = 1
  ): void {
    // Apply uniform scaling (raw OBJ units → meters)
    model.scale.setScalar(scaleFactor);

    // Convert precomputed center offset into world units so that the
    // pontoon's geometric center sits exactly on the requested grid
    // position even when the OBJ origin is offset.
    const centerOffset = modelInfo.center.clone().multiplyScalar(scaleFactor);

    model.position.set(
      gridPosition.x - centerOffset.x,
      gridPosition.y - centerOffset.y,
      gridPosition.z - centerOffset.z
    );

    // Keep any intrinsic orientation that was established at load time
    // (we purposely do NOT reset rotation here).
  }
  
  /**
   * Clear model cache (useful for hot reloading)
   */
  clearCache(): void {
    this.modelCache.clear();
  }
}

// Singleton instance
export const modelLoader = new ModelLoader();
