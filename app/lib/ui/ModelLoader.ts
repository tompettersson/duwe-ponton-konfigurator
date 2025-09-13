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
}

export class ModelLoader {
  private modelCache: Map<string, ModelInfo> = new Map();
  
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
      
      // Calculate bounding box and dimensions
      const box = new THREE.Box3().setFromObject(model);
      const dimensions = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      
      // Log analysis for debugging
      console.log('Double Pontoon Model Analysis:');
      console.log('- Dimensions (mm):', dimensions);
      console.log('- Center:', center);
      console.log('- Width:', dimensions.x, 'mm');
      console.log('- Height:', dimensions.y, 'mm');
      console.log('- Depth:', dimensions.z, 'mm');
      
      // Center the model at origin
      model.position.sub(center);
      
      // Create model info
      const modelInfo: ModelInfo = {
        model,
        dimensions,
        center,
        originalScale: 1
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
      
      // Calculate bounding box and dimensions
      const box = new THREE.Box3().setFromObject(model);
      const dimensions = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      
      // Center model at origin for easier placement
      model.position.sub(center);
      
      const info: ModelInfo = {
        model,
        dimensions,
        center,
        originalScale: 1,
      };
      this.modelCache.set('single-pontoon', info);
      return info;
    } catch (error) {
      console.error('Failed to load single pontoon model:', error);
      throw error;
    }
  }
  
  /**
   * Create a clone of a loaded model for placement
   */
  cloneModel(modelInfo: ModelInfo): THREE.Group {
    return modelInfo.model.clone();
  }
  
  /**
   * Calculate scale factor to fit model into grid cell
   * Grid cell is 500mm, model dimensions are in mm
   */
  calculateScaleFactor(modelInfo: ModelInfo, targetWidth: number = 1000): number {
    // Heuristic unit detection (OBJ has no unit metadata)
    // Expected pontoon width ≈ 500mm (single) or 1000mm (double)
    const rawWidth = modelInfo.dimensions.x; // in OBJ units
    let units: 'mm' | 'cm' | 'm';
    if (rawWidth > 200) units = 'mm';
    else if (rawWidth > 2) units = 'cm';
    else units = 'm';

    const unitsToMM = units === 'mm' ? 1 : units === 'cm' ? 10 : 1000;
    const currentWidthMM = rawWidth * unitsToMM;
    const scaleFactor = targetWidth / currentWidthMM;

    console.log('Scale calculation:', {
      rawWidth,
      detectedUnits: units,
      currentWidthMM,
      targetWidthMM: targetWidth,
      scaleFactor
    });

    return scaleFactor;
  }
  
  /**
   * Apply proper scaling and positioning to a model instance
   */
  prepareModelForGrid(
    model: THREE.Group, 
    gridPosition: THREE.Vector3,
    scaleFactor: number = 1
  ): void {
    // Apply scale
    model.scale.setScalar(scaleFactor);
    
    // Position at grid center
    model.position.copy(gridPosition);
    
    // Ensure proper rotation (if needed)
    model.rotation.set(0, 0, 0);
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
