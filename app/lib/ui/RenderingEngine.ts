/**
 * RenderingEngine - Three.js Integration with Domain Layer
 * 
 * Handles all 3D rendering using the new domain architecture
 * Replaces scattered rendering logic with centralized engine
 */

import * as THREE from 'three';
import { 
  Grid,
  GridPosition,
  Pontoon,
  PontoonType,
  PontoonColor,
  CoordinateCalculator,
  getPontoonTypeConfig,
  getPontoonColorConfig
} from '../domain';

export interface RenderingOptions {
  showGrid: boolean;
  showPreview: boolean;
  showSelection: boolean;
  showSupport: boolean;
  gridOpacity: number;
  previewOpacity: number;
  selectionColor: string;
  supportColor: string;
}

export interface PreviewData {
  position: GridPosition;
  type: PontoonType;
  color: PontoonColor;
  isValid: boolean;
}

export interface SelectionData {
  pontoonIds: Set<string>;
}

export interface SupportData {
  positions: GridPosition[];
  valid: boolean[];
}

export class RenderingEngine {
  private scene: THREE.Scene;
  private calculator: CoordinateCalculator;
  
  // Object groups for efficient management
  private pontoonGroup: THREE.Group;
  private gridGroup: THREE.Group;
  private previewGroup: THREE.Group;
  private selectionGroup: THREE.Group;
  private supportGroup: THREE.Group;
  
  // Material cache for performance
  private materialCache = new Map<string, THREE.Material>();
  private geometryCache = new Map<string, THREE.BufferGeometry>();
  
  // Rendering state
  private currentGrid: Grid | null = null;
  private currentOptions: RenderingOptions;
  
  // Performance tracking
  private renderStats = {
    totalRenders: 0,
    pontoonCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0
  };

  constructor(scene: THREE.Scene, options: Partial<RenderingOptions> = {}) {
    this.scene = scene;
    this.calculator = new CoordinateCalculator();
    
    // Default rendering options
    this.currentOptions = {
      showGrid: true,
      showPreview: true,
      showSelection: true,
      showSupport: false,
      gridOpacity: 0.3,
      previewOpacity: 0.6,
      selectionColor: '#ffff00',
      supportColor: '#00ff00',
      ...options
    };
    
    this.initializeGroups();
    this.createMaterials();
    this.createGeometries();
    
    console.log('🎨 RenderingEngine: Initialized with Three.js scene');
  }

  /**
   * Main render method - updates all 3D objects
   */
  render(
    grid: Grid,
    currentLevel: number,
    previewData?: PreviewData,
    selectionData?: SelectionData,
    supportData?: SupportData
  ): void {
    const startTime = performance.now();
    
    // Update grid if changed
    if (this.currentGrid !== grid) {
      this.renderGrid(grid, currentLevel);
      this.renderPontoons(grid);
      this.currentGrid = grid;
    }
    
    // Update preview
    if (this.currentOptions.showPreview && previewData) {
      this.renderPreview(previewData);
    } else {
      this.clearPreview();
    }
    
    // Update selection
    if (this.currentOptions.showSelection && selectionData) {
      this.renderSelection(grid, selectionData);
    } else {
      this.clearSelection();
    }
    
    // Update support visualization
    if (this.currentOptions.showSupport && supportData) {
      this.renderSupport(grid, supportData);
    } else {
      this.clearSupport();
    }
    
    // Update statistics
    const renderTime = performance.now() - startTime;
    this.updateRenderStats(renderTime, grid.getPontoonCount());
    
    console.log(`🎨 RenderingEngine: Rendered frame (${renderTime.toFixed(2)}ms)`);
  }

  /**
   * Render grid system
   */
  private renderGrid(grid: Grid, currentLevel: number): void {
    this.clearGroup(this.gridGroup);
    
    if (!this.currentOptions.showGrid) return;
    
    const { width, height } = grid.dimensions;
    const material = this.getMaterial('grid');
    const levelY = this.calculator.getLevelPhysicalY(currentLevel) / 1000; // Convert to meters
    
    // Create grid lines
    const gridGeometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    
    // Vertical lines (X direction)
    for (let x = 0; x <= width; x++) {
      const worldX = (x - width / 2) * 0.5; // 0.5m grid spacing
      positions.push(worldX, levelY, -height * 0.25); // Start
      positions.push(worldX, levelY, height * 0.25);   // End
    }
    
    // Horizontal lines (Z direction)
    for (let z = 0; z <= height; z++) {
      const worldZ = (z - height / 2) * 0.5;
      positions.push(-width * 0.25, levelY, worldZ); // Start
      positions.push(width * 0.25, levelY, worldZ);   // End
    }
    
    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    const gridLines = new THREE.LineSegments(gridGeometry, material);
    this.gridGroup.add(gridLines);
    
    // Add level indicator
    this.addLevelIndicator(currentLevel, levelY);
  }

  /**
   * Render all pontoons
   */
  private renderPontoons(grid: Grid): void {
    this.clearGroup(this.pontoonGroup);
    
    for (const pontoon of grid.pontoons.values()) {
      this.renderPontoon(pontoon, grid);
    }
  }

  /**
   * Render single pontoon
   */
  private renderPontoon(pontoon: Pontoon, grid: Grid): void {
    const worldPos = grid.gridToWorld(pontoon.position);
    const geometry = this.getGeometry(pontoon.type);
    const material = this.getMaterial(`pontoon-${pontoon.color}`);
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(worldPos.x, worldPos.y, worldPos.z);
    mesh.userData = { pontoonId: pontoon.id, pontoon };
    
    // Apply rotation if needed
    if (pontoon.rotation !== 0) {
      mesh.rotation.y = (pontoon.rotation * Math.PI) / 180;
    }
    
    this.pontoonGroup.add(mesh);
  }

  /**
   * Render preview pontoon
   */
  private renderPreview(previewData: PreviewData): void {
    this.clearGroup(this.previewGroup);
    
    const worldPos = this.calculator.gridToWorld(
      previewData.position,
      { width: 50, height: 50, levels: 3 } // Default dimensions
    );
    
    const geometry = this.getGeometry(previewData.type);
    const materialKey = previewData.isValid ? 'preview-valid' : 'preview-invalid';
    const material = this.getMaterial(materialKey);
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(worldPos.x, worldPos.y, worldPos.z);
    
    this.previewGroup.add(mesh);
  }

  /**
   * Render selection highlights
   */
  private renderSelection(grid: Grid, selectionData: SelectionData): void {
    this.clearGroup(this.selectionGroup);
    
    for (const pontoonId of selectionData.pontoonIds) {
      const pontoon = grid.pontoons.get(pontoonId);
      if (!pontoon) continue;
      
      const worldPos = grid.gridToWorld(pontoon.position);
      const geometry = this.getGeometry('selection-outline');
      const material = this.getMaterial('selection');
      
      const outline = new THREE.Mesh(geometry, material);
      outline.position.set(worldPos.x, worldPos.y, worldPos.z);
      outline.scale.set(1.1, 1.1, 1.1); // Slightly larger for outline effect
      
      this.selectionGroup.add(outline);
    }
  }

  /**
   * Render support visualization
   */
  private renderSupport(grid: Grid, supportData: SupportData): void {
    this.clearGroup(this.supportGroup);
    
    for (let i = 0; i < supportData.positions.length; i++) {
      const position = supportData.positions[i];
      const isValid = supportData.valid[i];
      
      const worldPos = grid.gridToWorld(position);
      const geometry = this.getGeometry('support-indicator');
      const material = this.getMaterial(isValid ? 'support-valid' : 'support-invalid');
      
      const indicator = new THREE.Mesh(geometry, material);
      indicator.position.set(worldPos.x, worldPos.y - 0.1, worldPos.z); // Slightly below
      
      this.supportGroup.add(indicator);
    }
  }

  /**
   * Add level indicator to grid
   */
  private addLevelIndicator(level: number, levelY: number): void {
    const textGeometry = new THREE.BufferGeometry(); // Placeholder for text
    const textMaterial = this.getMaterial('text');
    
    // Add level text indicator (simplified)
    const levelIndicator = new THREE.Mesh(
      this.getGeometry('level-indicator'),
      textMaterial
    );
    levelIndicator.position.set(-12, levelY + 0.1, -12);
    
    this.gridGroup.add(levelIndicator);
  }

  /**
   * Update rendering options
   */
  updateOptions(options: Partial<RenderingOptions>): void {
    this.currentOptions = { ...this.currentOptions, ...options };
    
    // Update material properties
    this.updateMaterialProperties();
    
    console.log('🎨 RenderingEngine: Options updated', options);
  }

  /**
   * Clear specific group
   */
  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      
      // Dispose geometry and material if needed
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
  }

  /**
   * Clear preview
   */
  private clearPreview(): void {
    this.clearGroup(this.previewGroup);
  }

  /**
   * Clear selection
   */
  private clearSelection(): void {
    this.clearGroup(this.selectionGroup);
  }

  /**
   * Clear support visualization
   */
  private clearSupport(): void {
    this.clearGroup(this.supportGroup);
  }

  /**
   * Initialize Three.js groups
   */
  private initializeGroups(): void {
    this.pontoonGroup = new THREE.Group();
    this.pontoonGroup.name = 'pontoons';
    this.scene.add(this.pontoonGroup);
    
    this.gridGroup = new THREE.Group();
    this.gridGroup.name = 'grid';
    this.scene.add(this.gridGroup);
    
    this.previewGroup = new THREE.Group();
    this.previewGroup.name = 'preview';
    this.scene.add(this.previewGroup);
    
    this.selectionGroup = new THREE.Group();
    this.selectionGroup.name = 'selection';
    this.scene.add(this.selectionGroup);
    
    this.supportGroup = new THREE.Group();
    this.supportGroup.name = 'support';
    this.scene.add(this.supportGroup);
  }

  /**
   * Create and cache materials
   */
  private createMaterials(): void {
    // Grid material
    this.materialCache.set('grid', new THREE.LineBasicMaterial({
      color: 0x888888,
      opacity: this.currentOptions.gridOpacity,
      transparent: true
    }));
    
    // Pontoon materials for each color
    const pontoonColors = {
      blue: '#6183c2',
      black: '#111111',
      grey: '#e3e4e5',
      yellow: '#f7e295'
    };
    
    for (const [colorName, hex] of Object.entries(pontoonColors)) {
      this.materialCache.set(`pontoon-${colorName}`, new THREE.MeshLambertMaterial({
        color: hex
      }));
    }
    
    // Preview materials
    this.materialCache.set('preview-valid', new THREE.MeshLambertMaterial({
      color: 0x00ff00,
      opacity: this.currentOptions.previewOpacity,
      transparent: true
    }));
    
    this.materialCache.set('preview-invalid', new THREE.MeshLambertMaterial({
      color: 0xff0000,
      opacity: this.currentOptions.previewOpacity,
      transparent: true
    }));
    
    // Selection material
    this.materialCache.set('selection', new THREE.MeshBasicMaterial({
      color: this.currentOptions.selectionColor,
      wireframe: true
    }));
    
    // Support materials
    this.materialCache.set('support-valid', new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      opacity: 0.5,
      transparent: true
    }));
    
    this.materialCache.set('support-invalid', new THREE.MeshBasicMaterial({
      color: 0xff0000,
      opacity: 0.5,
      transparent: true
    }));
    
    // Text material
    this.materialCache.set('text', new THREE.MeshBasicMaterial({
      color: 0xffffff
    }));
  }

  /**
   * Create and cache geometries
   */
  private createGeometries(): void {
    // Single pontoon geometry
    this.geometryCache.set('single', new THREE.BoxGeometry(0.5, 0.4, 0.5));
    
    // Double pontoon geometry
    this.geometryCache.set('double', new THREE.BoxGeometry(1.0, 0.4, 0.5));
    
    // Selection outline (slightly larger box)
    this.geometryCache.set('selection-outline', new THREE.BoxGeometry(0.55, 0.45, 0.55));
    
    // Support indicator (small cylinder)
    this.geometryCache.set('support-indicator', new THREE.CylinderGeometry(0.1, 0.1, 0.05));
    
    // Level indicator (small box)
    this.geometryCache.set('level-indicator', new THREE.BoxGeometry(0.2, 0.1, 0.2));
  }

  /**
   * Get cached material
   */
  private getMaterial(key: string): THREE.Material {
    const material = this.materialCache.get(key);
    if (!material) {
      console.warn('🎨 RenderingEngine: Material not found:', key);
      return new THREE.MeshBasicMaterial({ color: 0xff00ff }); // Magenta fallback
    }
    return material;
  }

  /**
   * Get cached geometry
   */
  private getGeometry(key: string): THREE.BufferGeometry {
    let geometryKey = key;
    
    // Map pontoon types to geometry keys
    if (key === PontoonType.SINGLE) geometryKey = 'single';
    if (key === PontoonType.DOUBLE) geometryKey = 'double';
    
    const geometry = this.geometryCache.get(geometryKey);
    if (!geometry) {
      console.warn('🎨 RenderingEngine: Geometry not found:', geometryKey);
      return new THREE.BoxGeometry(0.5, 0.4, 0.5); // Default fallback
    }
    return geometry;
  }

  /**
   * Update material properties based on options
   */
  private updateMaterialProperties(): void {
    // Update grid opacity
    const gridMaterial = this.materialCache.get('grid');
    if (gridMaterial && 'opacity' in gridMaterial) {
      gridMaterial.opacity = this.currentOptions.gridOpacity;
    }
    
    // Update preview opacity
    const previewValidMaterial = this.materialCache.get('preview-valid');
    if (previewValidMaterial && 'opacity' in previewValidMaterial) {
      previewValidMaterial.opacity = this.currentOptions.previewOpacity;
    }
    
    const previewInvalidMaterial = this.materialCache.get('preview-invalid');
    if (previewInvalidMaterial && 'opacity' in previewInvalidMaterial) {
      previewInvalidMaterial.opacity = this.currentOptions.previewOpacity;
    }
    
    // Update selection color
    const selectionMaterial = this.materialCache.get('selection');
    if (selectionMaterial && 'color' in selectionMaterial) {
      (selectionMaterial as THREE.MeshBasicMaterial).color.setStyle(this.currentOptions.selectionColor);
    }
  }

  /**
   * Update render statistics
   */
  private updateRenderStats(renderTime: number, pontoonCount: number): void {
    this.renderStats.totalRenders++;
    this.renderStats.pontoonCount = pontoonCount;
    this.renderStats.lastRenderTime = renderTime;
    
    this.renderStats.averageRenderTime = 
      (this.renderStats.averageRenderTime * (this.renderStats.totalRenders - 1) + renderTime) 
      / this.renderStats.totalRenders;
  }

  /**
   * Get rendering statistics
   */
  getStats(): {
    totalRenders: number;
    pontoonCount: number;
    averageRenderTime: number;
    lastRenderTime: number;
    cacheStats: {
      materialCount: number;
      geometryCount: number;
    };
  } {
    return {
      ...this.renderStats,
      cacheStats: {
        materialCount: this.materialCache.size,
        geometryCount: this.geometryCache.size
      }
    };
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    // Clear all groups
    this.clearGroup(this.pontoonGroup);
    this.clearGroup(this.gridGroup);
    this.clearGroup(this.previewGroup);
    this.clearGroup(this.selectionGroup);
    this.clearGroup(this.supportGroup);
    
    // Dispose cached materials
    for (const material of this.materialCache.values()) {
      material.dispose();
    }
    this.materialCache.clear();
    
    // Dispose cached geometries
    for (const geometry of this.geometryCache.values()) {
      geometry.dispose();
    }
    this.geometryCache.clear();
    
    console.log('🧹 RenderingEngine: All resources disposed');
  }
}