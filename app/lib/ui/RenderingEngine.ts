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
  Rotation,
  CoordinateCalculator,
  getPontoonTypeConfig,
  getPontoonColorConfig
} from '../domain';
import { modelLoader, type ModelInfo } from './ModelLoader';

const CONNECTOR_TARGET_HEIGHT_MM = 240; // Four stacked lugs (~60mm each) for a single-layer pin
const CONNECTOR_HEAD_ABOVE_TOP_MM = 0; // Keep connector head flush with deck by default
const EDGE_CONNECTOR_BOLT_HEIGHT_MM = 105;
const EDGE_CONNECTOR_NUT_HEIGHT_MM = 30;
const EDGE_SPACER_DOUBLE_HEIGHT_MM = 32;
const EDGE_SPACER_SINGLE_HEIGHT_MM = 16;

type ConnectorVariant = 'standard' | 'long';

interface ConnectorPlacement {
  key: string;
  level: number;
  lugCount: number;
  worldPosition: THREE.Vector3;
}

export interface RenderingOptions {
  showGrid: boolean;
  showPreview: boolean;
  showSelection: boolean;
  showSupport: boolean;
  showPlacementDebug: boolean;
  gridOpacity: number;
  previewOpacity: number;
  selectionColor: string;
  supportColor: string;
  use3DModels: boolean; // NEW: Toggle between simple boxes and 3D models
}

export interface PreviewData {
  position: GridPosition;
  type: PontoonType;
  color: PontoonColor;
  isValid: boolean;
  rotation?: Rotation; // Optional rotation for accurate preview alignment
}

export interface SelectionData {
  pontoonIds: Set<string>;
}

export interface SupportData {
  positions: GridPosition[];
  valid: boolean[];
}

export interface PlacementDebugData {
  cells: GridPosition[];
}

export class RenderingEngine {
  private scene: THREE.Scene;
  private calculator: CoordinateCalculator;
  
  // Object groups for efficient management
  private pontoonGroup: THREE.Group;
  private connectorGroup: THREE.Group;
  private gridGroup: THREE.Group;
  private previewGroup: THREE.Group;
  private hoverCellGroup: THREE.Group;
  private placementDebugGroup: THREE.Group;
  private selectionGroup: THREE.Group;
  private supportGroup: THREE.Group;
  
  // Material cache for performance
  private materialCache = new Map<string, THREE.Material>();
  private geometryCache = new Map<string, THREE.BufferGeometry>();
  
  // 3D Model cache
  private modelCache = new Map<string, ModelInfo>();
  private modelLoadPromises = new Map<string, Promise<ModelInfo>>();
  private connectorScaleCache = new Map<string, number>();
  
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
      showPlacementDebug: true,
      gridOpacity: 0.3,
      previewOpacity: 0.6,
      selectionColor: '#ffff00',
      supportColor: '#00ff00',
      use3DModels: true, // Use 3D models by default
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
  async render(
    grid: Grid,
    currentLevel: number,
    previewData?: PreviewData,
    selectionData?: SelectionData,
    supportData?: SupportData,
    placementDebugData?: PlacementDebugData
  ): Promise<void> {
    const startTime = performance.now();
    
    // Update grid if changed
    if (this.currentGrid !== grid) {
      this.renderGrid(grid, currentLevel);
      await this.renderPontoons(grid);
      await this.renderConnectors(grid);
      this.currentGrid = grid;
    }
    // Update placement debug overlay each frame
    if (this.currentOptions.showPlacementDebug && placementDebugData?.cells?.length) {
      this.renderPlacementDebug(grid, placementDebugData.cells);
    } else {
      this.clearPlacementDebug();
    }
    
    // Update preview and hovered-cell outline
    if (previewData) {
      if (this.currentOptions.showPreview) {
        this.renderPreview(previewData);
      } else {
        this.clearPreview();
      }
      this.renderHoveredCell(previewData.position);
    } else {
      this.clearPreview();
      this.clearHoveredCell();
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

  /** Show the exact hovered grid cell as an outline + light fill */
  private renderHoveredCell(position: GridPosition): void {
    this.clearGroup(this.hoverCellGroup);
    try {
      const dims = this.currentGrid?.dimensions ?? { width: 50, height: 50, levels: 3 } as any;
      const world = this.calculator.gridToWorld(position, dims);
      const outline = new THREE.Mesh(this.getGeometry('cell-plane'), this.getMaterial('cell-outline'));
      outline.position.set(world.x, world.y + 0.001, world.z);
      outline.rotation.x = -Math.PI / 2;
      this.hoverCellGroup.add(outline);

      const fill = new THREE.Mesh(this.getGeometry('cell-plane'), this.getMaterial('cell-fill'));
      fill.position.set(world.x, world.y + 0.0005, world.z);
      fill.rotation.x = -Math.PI / 2;
      this.hoverCellGroup.add(fill);
    } catch {}
  }

  private clearHoveredCell(): void {
    this.clearGroup(this.hoverCellGroup);
  }

  /** Highlight the grid cells used for the latest placement (debug helper) */
  private renderPlacementDebug(grid: Grid, cells: GridPosition[]): void {
    this.clearGroup(this.placementDebugGroup);
    if (!cells.length) return;

    try {
      const seen = new Set<string>();

      for (const cell of cells) {
        const key = `${cell.x}:${cell.y}:${cell.z}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const world = grid.gridToWorld(cell);

        const outline = new THREE.Mesh(this.getGeometry('cell-plane'), this.getMaterial('placement-outline'));
        outline.position.set(world.x, world.y + 0.0008, world.z);
        outline.rotation.x = -Math.PI / 2;
        this.placementDebugGroup.add(outline);

        const fill = new THREE.Mesh(this.getGeometry('cell-plane'), this.getMaterial('placement-fill'));
        fill.position.set(world.x, world.y + 0.0003, world.z);
        fill.rotation.x = -Math.PI / 2;
        this.placementDebugGroup.add(fill);
      }
    } catch {}
  }

  private clearPlacementDebug(): void {
    this.clearGroup(this.placementDebugGroup);
  }

  /**
   * Render all pontoons
   */
  private async renderPontoons(grid: Grid): Promise<void> {
    this.clearGroup(this.pontoonGroup);
    
    // Render all pontoons in parallel for better performance
    const renderPromises = Array.from(grid.pontoons.values()).map(pontoon => 
      this.renderPontoon(pontoon, grid)
    );
    
    await Promise.all(renderPromises);
  }

  /**
   * Render automatically generated connectors between adjacent pontoons
   */
  private async renderConnectors(grid: Grid): Promise<void> {
    this.clearGroup(this.connectorGroup);

    const placements = this.computeConnectorPlacements(grid);
    if (placements.length === 0) {
      return;
    }

    const interiorPlacements = placements.filter(p => p.lugCount >= 4);
    const edgePlacements = placements.filter(p => p.lugCount === 2 || p.lugCount === 3);

    if (interiorPlacements.length) {
      try {
        const variant: ConnectorVariant = 'standard';
        const modelInfo = await this.loadConnectorModel(variant);
        const scaleFactor = this.getScaleFactorForHardware(`connector-${variant}`, modelInfo, CONNECTOR_TARGET_HEIGHT_MM);
        const connectorHeightM = modelInfo.dimensions.y * scaleFactor;

        for (const placement of interiorPlacements) {
          const mesh = modelLoader.cloneModel(modelInfo);
          const base = placement.worldPosition;
          const centerY = this.getConnectorCenterY(placement.level, connectorHeightM);
          const position = new THREE.Vector3(base.x, centerY, base.z);

          modelLoader.prepareModelForGrid(mesh, position, modelInfo, scaleFactor);
          mesh.userData = {
            connectorKey: placement.key,
            level: placement.level,
            lugCount: placement.lugCount,
            variant
          };

          this.connectorGroup.add(mesh);
        }
      } catch (error) {
        console.warn('RenderingEngine: Failed to render standard connectors – skipping these placements.', error);
      }
    }

    if (edgePlacements.length) {
      try {
        await this.renderEdgeConnectors(edgePlacements);
      } catch (error) {
        console.warn('RenderingEngine: Failed to render edge connectors – skipping these placements.', error);
      }
    }
  }

  /**
   * Render single pontoon
   */
  private async renderPontoon(pontoon: Pontoon, grid: Grid): Promise<void> {
    const worldPos = grid.gridToWorld(pontoon.position);
    
    if (this.currentOptions.use3DModels) {
      // Use 3D model
      await this.render3DPontoon(pontoon, worldPos);
    } else {
      // Use simple box geometry
      this.renderBoxPontoon(pontoon, worldPos);
    }
  }

  /**
   * Render pontoon using simple box geometry
   */
  private renderBoxPontoon(pontoon: Pontoon, worldPos: THREE.Vector3): void {
    const geometry = this.getGeometry(pontoon.type);
    const material = this.getMaterial(`pontoon-${pontoon.color}`);
    
    const mesh = new THREE.Mesh(geometry, material);
    const positioned = this.applyFootprintOffsetByType(pontoon.type, pontoon.rotation, worldPos);
    mesh.position.set(positioned.x, positioned.y, positioned.z);
    mesh.userData = { pontoonId: pontoon.id, pontoon };
    
    // Apply rotation if needed
    if (pontoon.rotation !== 0) {
      mesh.rotation.y = (pontoon.rotation * Math.PI) / 180;
    }
    
    this.pontoonGroup.add(mesh);
  }
  
  /**
   * Render pontoon using 3D model
   */
  private async render3DPontoon(pontoon: Pontoon, worldPos: THREE.Vector3): Promise<void> {
    try {
      // Load 3D model (cached)
      const modelInfo = await this.load3DModel(pontoon.type);

      // Sanity: if a SINGLE is requested but the loaded model looks DOUBLE, fallback to box
      if (pontoon.type === PontoonType.SINGLE && modelInfo.inferredType === 'double') {
        console.warn('3D model appears to be DOUBLE while SINGLE requested. Falling back to box.', modelInfo);
        this.renderBoxPontoon(pontoon, worldPos);
        return;
      }
      
      // Clone the model for this instance
      const pontoonMesh = modelLoader.cloneModel(modelInfo);
      
      // Calculate scale factor for proper size
      // For pontoons, use HEIGHT (400mm) as the reliable scaling reference.
      // Width/depth often include connector overhangs, but height is the
      // exact body dimension in the real world.
      const scaleFactor = modelLoader.calculateScaleFactorByHeight(modelInfo, 400);
      
      // Apply positioning and scaling
      const positioned = this.applyFootprintOffsetByType(pontoon.type, pontoon.rotation, worldPos);
      modelLoader.prepareModelForGrid(pontoonMesh, positioned, modelInfo, scaleFactor);

      // Optional: compute and log overhang for debugging/validation.
      try {
        const targetWidthMM = pontoon.type === PontoonType.DOUBLE ? 1000 : 500;
        const targetDepthMM = 500;
        modelLoader.computeOverhang(modelInfo, { targetWidthMM, targetDepthMM, scaleFactor });
      } catch {}
      
      // Apply color/material to match pontoon color
      const colorHex = getPontoonColorConfig(pontoon.color).hex;
      pontoonMesh.traverse((obj: any) => {
        if (obj && obj.isMesh) {
          const mesh = obj as THREE.Mesh;
          const current = mesh.material as any;
          if (Array.isArray(current)) {
            mesh.material = current.map((m) => {
              const mat = new THREE.MeshStandardMaterial({ color: colorHex });
              mat.metalness = 0.0;
              mat.roughness = 0.9;
              return mat;
            });
          } else {
            const mat = new THREE.MeshStandardMaterial({ color: colorHex });
            mat.metalness = 0.0;
            mat.roughness = 0.9;
            mesh.material = mat;
          }
        }
      });
      
      // Set user data
      pontoonMesh.userData = { pontoonId: pontoon.id, pontoon };
      
      // Apply rotation if needed
      if (pontoon.rotation !== 0) {
        pontoonMesh.rotation.y = (pontoon.rotation * Math.PI) / 180;
      }
      
      this.pontoonGroup.add(pontoonMesh);
      
    } catch (error) {
      console.warn(`Failed to load 3D model for pontoon ${pontoon.id}, falling back to box:`, error);
      // Fallback to box rendering
      this.renderBoxPontoon(pontoon, worldPos);
    }
  }

  /**
   * Calculate the correct world position for a pontoon, applying an offset so that
   * multi-cell pontoons (e.g., DOUBLE) are centered over their full footprint
   * starting from the anchor grid cell (top-left min corner in domain terms).
   */
  private getWorldPositionWithOffset(pontoon: Pontoon, baseWorldPos: THREE.Vector3): THREE.Vector3 {
    return this.applyFootprintOffsetByType(pontoon.type, pontoon.rotation, baseWorldPos);
  }

  private getScaleFactorForHardware(cacheKey: string, modelInfo: ModelInfo, targetHeightMM: number): number {
    if (this.connectorScaleCache.has(cacheKey)) {
      return this.connectorScaleCache.get(cacheKey)!;
    }

    const scale = modelLoader.calculateScaleFactorByHeight(modelInfo, targetHeightMM);
    this.connectorScaleCache.set(cacheKey, scale);
    return scale;
  }

  private async renderEdgeConnectors(placements: ConnectorPlacement[]): Promise<void> {
    const [boltInfo, nutInfo, spacerDoubleInfo, spacerSingleInfo] = await Promise.all([
      modelLoader.loadEdgeConnectorBolt(),
      modelLoader.loadEdgeConnectorNut(),
      modelLoader.loadEdgeSpacer('double'),
      modelLoader.loadEdgeSpacer('single')
    ]);

    const boltScale = this.getScaleFactorForHardware('edge-bolt', boltInfo, EDGE_CONNECTOR_BOLT_HEIGHT_MM);
    const nutScale = this.getScaleFactorForHardware('edge-nut', nutInfo, EDGE_CONNECTOR_NUT_HEIGHT_MM);
    const spacerDoubleScale = this.getScaleFactorForHardware('edge-spacer-double', spacerDoubleInfo, EDGE_SPACER_DOUBLE_HEIGHT_MM);
    const spacerSingleScale = this.getScaleFactorForHardware('edge-spacer-single', spacerSingleInfo, EDGE_SPACER_SINGLE_HEIGHT_MM);

    const pontoonHeightM = CoordinateCalculator.CONSTANTS.PONTOON_HEIGHT_MM / CoordinateCalculator.CONSTANTS.PRECISION_FACTOR;
    const deckOffsetM = pontoonHeightM / 2;

    for (const placement of placements) {
      const base = placement.worldPosition;
      const deckTopM = placement.level * pontoonHeightM + deckOffsetM;

      const boltHeightM = boltInfo.dimensions.y * boltScale;
      const nutHeightM = nutInfo.dimensions.y * nutScale;

      const useDoubleSpacer = placement.lugCount === 2;
      const spacerInfo = useDoubleSpacer ? spacerDoubleInfo : spacerSingleInfo;
      const spacerScale = useDoubleSpacer ? spacerDoubleScale : spacerSingleScale;
      const spacerHeightM = spacerInfo.dimensions.y * spacerScale;

      // Bolt (includes head) - top aligns with top of nut for visual clarity
      const boltMesh = modelLoader.cloneModel(boltInfo);
      const boltCenterY = deckTopM + nutHeightM - boltHeightM / 2;
      modelLoader.prepareModelForGrid(boltMesh, new THREE.Vector3(base.x, boltCenterY, base.z), boltInfo, boltScale);
      boltMesh.userData = {
        connectorKey: placement.key,
        level: placement.level,
        lugCount: placement.lugCount,
        variant: 'edge-bolt'
      };
      this.connectorGroup.add(boltMesh);

      // Spacer (washer stack)
      if (spacerHeightM > 0) {
        const spacerMesh = modelLoader.cloneModel(spacerInfo);
        // Spacers nest inside the lug stack, so their top aligns with the deck surface.
        const spacerCenterY = deckTopM - spacerHeightM / 2;
        modelLoader.prepareModelForGrid(spacerMesh, new THREE.Vector3(base.x, spacerCenterY, base.z), spacerInfo, spacerScale);
        spacerMesh.userData = {
          connectorKey: placement.key,
          level: placement.level,
          lugCount: placement.lugCount,
          variant: useDoubleSpacer ? 'edge-spacer-double' : 'edge-spacer-single'
        };
        this.connectorGroup.add(spacerMesh);
      }

      // Nut sits above spacer stack
      const nutMesh = modelLoader.cloneModel(nutInfo);
      const nutCenterY = deckTopM + nutHeightM / 2;
      modelLoader.prepareModelForGrid(nutMesh, new THREE.Vector3(base.x, nutCenterY, base.z), nutInfo, nutScale);
      nutMesh.userData = {
        connectorKey: placement.key,
        level: placement.level,
        lugCount: placement.lugCount,
        variant: 'edge-nut'
      };
      this.connectorGroup.add(nutMesh);
    }
  }

  private getConnectorCenterY(level: number, connectorHeightM: number): number {
    const pontoonHeightM = CoordinateCalculator.CONSTANTS.PONTOON_HEIGHT_MM / CoordinateCalculator.CONSTANTS.PRECISION_FACTOR;
    // CoordinateCalculator reports level positions at pontoon centerlines, so the deck
    // surface for a level sits half a pontoon height above that origin.
    const deckTopM = level * pontoonHeightM + pontoonHeightM / 2;
    const headOffsetM = CONNECTOR_HEAD_ABOVE_TOP_MM / 1000;
    return deckTopM + headOffsetM - connectorHeightM / 2;
  }

  private computeConnectorPlacements(grid: Grid): ConnectorPlacement[] {
    if (grid.pontoons.size === 0) {
      return [];
    }

    type Intersection = {
      level: number;
      cells: Set<string>;
      pontoonIds: Set<string>;
    };

    const intersections = new Map<string, Intersection>();

    const registerIntersection = (
      level: number,
      corner: { x: number; z: number },
      cellKey: string,
      pontoonId: string
    ) => {
      const key = `${level}:${corner.x}:${corner.z}`;
      let entry = intersections.get(key);
      if (!entry) {
        entry = {
          level,
          cells: new Set<string>(),
          pontoonIds: new Set<string>()
        };
        intersections.set(key, entry);
      }
      entry.cells.add(cellKey);
      entry.pontoonIds.add(pontoonId);
    };

    for (const pontoon of grid.pontoons.values()) {
      for (const cell of pontoon.getOccupiedPositions()) {
        const cellKey = `${cell.x},${cell.z}`;
        const corners = [
          { x: cell.x, z: cell.z },
          { x: cell.x + 1, z: cell.z },
          { x: cell.x, z: cell.z + 1 },
          { x: cell.x + 1, z: cell.z + 1 }
        ];

        for (const corner of corners) {
          registerIntersection(cell.y, corner, cellKey, pontoon.id);
        }
      }
    }

    const placements: ConnectorPlacement[] = [];

    for (const [key, data] of intersections.entries()) {
      const lugCount = data.cells.size;
      if (lugCount < 2 || data.pontoonIds.size < 2) {
        continue; // Need at least two lugs and two distinct pontoons to warrant hardware
      }

      const [, xStr, zStr] = key.split(':');
      const corner = { x: Number(xStr), z: Number(zStr) };
      const world = this.calculator.gridIntersectionToWorld(corner, data.level, grid.dimensions);

      placements.push({
        key,
        level: data.level,
        lugCount,
        worldPosition: new THREE.Vector3(world.x, world.y, world.z)
      });
    }

    return placements;
  }

  private async loadConnectorModel(variant: ConnectorVariant): Promise<ModelInfo> {
    const cacheKey = `connector-${variant}`;

    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey)!;
    }

    if (this.modelLoadPromises.has(cacheKey)) {
      return this.modelLoadPromises.get(cacheKey)!;
    }

    const loadPromise = modelLoader.loadConnector(variant);
    this.modelLoadPromises.set(cacheKey, loadPromise);

    try {
      const modelInfo = await loadPromise;
      this.modelCache.set(cacheKey, modelInfo);
      return modelInfo;
    } finally {
      this.modelLoadPromises.delete(cacheKey);
    }
  }

  /**
   * Apply the same footprint-centering offset used for placed pontoons,
   * but parameterized by type/rotation so previews can match exactly.
   */
  private applyFootprintOffsetByType(
    type: PontoonType,
    rotation: Rotation,
    baseWorldPos: THREE.Vector3
  ): THREE.Vector3 {
    // Base world position corresponds to the center of the anchor grid cell
    const pos = new THREE.Vector3(baseWorldPos.x, baseWorldPos.y, baseWorldPos.z);

    // Determine effective footprint in grid cells considering rotation
    const config = getPontoonTypeConfig(type);
    let sizeX = config.gridSize.x;
    let sizeZ = config.gridSize.z;
    if (rotation === Rotation.EAST || rotation === Rotation.WEST) {
      const tmp = sizeX;
      sizeX = sizeZ;
      sizeZ = tmp;
    }

    // Cell size in meters
    const cellSizeM = CoordinateCalculator.CONSTANTS.CELL_SIZE_MM / 1000;

    // Offset from the anchor cell center to the footprint center
    const offsetX = ((sizeX - 1) / 2) * cellSizeM;
    const offsetZ = ((sizeZ - 1) / 2) * cellSizeM;

    pos.x += offsetX;
    pos.z += offsetZ;
    return pos;
  }
  
  /**
   * Load 3D model with caching
   */
  private async load3DModel(type: PontoonType): Promise<ModelInfo> {
    const cacheKey = `3d-${type}`;
    
    // Return cached model if available
    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey)!;
    }
    
    // Return existing promise if already loading
    if (this.modelLoadPromises.has(cacheKey)) {
      return this.modelLoadPromises.get(cacheKey)!;
    }
    
    // Start loading
    const loadPromise = this.loadModelForType(type);
    this.modelLoadPromises.set(cacheKey, loadPromise);
    
    try {
      const modelInfo = await loadPromise;
      this.modelCache.set(cacheKey, modelInfo);
      return modelInfo;
    } finally {
      this.modelLoadPromises.delete(cacheKey);
    }
  }
  
  /**
   * Load specific model for pontoon type
   */
  private async loadModelForType(type: PontoonType): Promise<ModelInfo> {
    switch (type) {
      case PontoonType.DOUBLE:
        return await modelLoader.loadDoublePontoon();
      case PontoonType.SINGLE:
        return await modelLoader.loadSinglePontoon();
      default:
        throw new Error(`Unknown pontoon type: ${type}`);
    }
  }

  /**
   * Render preview pontoon
   */
  private renderPreview(previewData: PreviewData): void {
    this.clearGroup(this.previewGroup);
    
    const dims = this.currentGrid?.dimensions ?? { width: 50, height: 50, levels: 3 } as any;
    const worldPos = this.calculator.gridToWorld(previewData.position, dims);
    
    const geometry = this.getGeometry(previewData.type);
    const materialKey = previewData.isValid ? 'preview-valid' : 'preview-invalid';
    const material = this.getMaterial(materialKey);
    
    const mesh = new THREE.Mesh(geometry, material);
    const rotation = previewData.rotation ?? Rotation.NORTH;
    // Apply the same footprint offset as real placement so preview aligns perfectly
    const positioned = this.applyFootprintOffsetByType(
      previewData.type,
      rotation,
      new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z)
    );
    mesh.position.set(positioned.x, positioned.y, positioned.z);
    // Apply preview rotation to match placement orientation
    if (rotation !== 0) {
      mesh.rotation.y = (rotation * Math.PI) / 180;
    }
    
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

    this.connectorGroup = new THREE.Group();
    this.connectorGroup.name = 'connectors';
    this.scene.add(this.connectorGroup);
    
    this.gridGroup = new THREE.Group();
    this.gridGroup.name = 'grid';
    this.scene.add(this.gridGroup);
    
    this.previewGroup = new THREE.Group();
    this.previewGroup.name = 'preview';
    this.scene.add(this.previewGroup);
    
    this.hoverCellGroup = new THREE.Group();
    this.hoverCellGroup.name = 'hover-cell';
    this.scene.add(this.hoverCellGroup);
    
    this.placementDebugGroup = new THREE.Group();
    this.placementDebugGroup.name = 'placement-debug';
    this.scene.add(this.placementDebugGroup);
    
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
    
    // Hovered cell debug materials
    this.materialCache.set('cell-outline', new THREE.MeshBasicMaterial({
      color: 0x4a90ff,
      wireframe: true
    }));
    this.materialCache.set('cell-fill', new THREE.MeshBasicMaterial({
      color: 0x4a90ff,
      transparent: true,
      opacity: 0.12
    }));

    // Placement debug materials (used to visualize latest drop location)
    this.materialCache.set('placement-outline', new THREE.MeshBasicMaterial({ color: 0xff3366, wireframe: true }));
    this.materialCache.set('placement-fill', new THREE.MeshBasicMaterial({ color: 0xff3366, transparent: true, opacity: 0.18 }));
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
    
    // Plane representing a single grid cell (XZ plane)
    this.geometryCache.set('cell-plane', new THREE.PlaneGeometry(
      CoordinateCalculator.CONSTANTS.CELL_SIZE_MM / 1000,
      CoordinateCalculator.CONSTANTS.CELL_SIZE_MM / 1000
    ));
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
   * Toggle between 3D models and simple boxes
   */
  async toggle3DModels(use3D: boolean, grid?: Grid): Promise<void> {
    if (this.currentOptions.use3DModels === use3D) {
      return; // No change needed
    }
    
    this.currentOptions.use3DModels = use3D;
    
    // Force re-render if grid is provided
    if (grid) {
      this.currentGrid = null; // Force refresh
      await this.renderPontoons(grid);
      await this.renderConnectors(grid);
    }
    
    console.log(`🎨 RenderingEngine: Switched to ${use3D ? '3D models' : 'simple boxes'}`);
  }
  
  /**
   * Check if 3D models are currently enabled
   */
  is3DModelsEnabled(): boolean {
    return this.currentOptions.use3DModels;
  }

  /**
   * Get rendering statistics
   */
  getStats(): {
    totalRenders: number;
    pontoonCount: number;
    averageRenderTime: number;
    lastRenderTime: number;
    use3DModels: boolean;
    cacheStats: {
      materialCount: number;
      geometryCount: number;
      modelCount: number;
    };
  } {
    return {
      ...this.renderStats,
      use3DModels: this.currentOptions.use3DModels,
      cacheStats: {
        materialCount: this.materialCache.size,
        geometryCount: this.geometryCache.size,
        modelCount: this.modelCache.size
      }
    };
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    // Clear all groups
    this.clearGroup(this.pontoonGroup);
    this.clearGroup(this.connectorGroup);
    this.clearGroup(this.gridGroup);
    this.clearGroup(this.previewGroup);
    this.clearGroup(this.hoverCellGroup);
    this.clearGroup(this.placementDebugGroup);
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
