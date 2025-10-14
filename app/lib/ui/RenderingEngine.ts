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
import {
  computeConnectorPlacements,
  determineConnectorVariant,
  type ConnectorPlacement,
  type ConnectorVariant
} from './connectorPlanner';

const CONNECTOR_STANDARD_HEIGHT_MM = 240; // Four stacked lugs (~60mm each) for a single-layer pin
const CONNECTOR_LONG_HEIGHT_MM = CONNECTOR_STANDARD_HEIGHT_MM + CoordinateCalculator.CONSTANTS.PONTOON_HEIGHT_MM; // span one extra pontoon height
const CONNECTOR_HEAD_ABOVE_TOP_MM = 0; // Keep connector head flush with deck by default
const EDGE_CONNECTOR_BOLT_HEIGHT_MM = 105;
const EDGE_CONNECTOR_NUT_HEIGHT_MM = 30;
const EDGE_SPACER_DOUBLE_HEIGHT_MM = 32;
const EDGE_SPACER_SINGLE_HEIGHT_MM = 16;
const EDGE_NUT_COMPRESSION_MM = 3; // Allow nut to compress washer stack slightly so it sits flush
const DRAIN_PLUG_HEIGHT_MM = 35;
const DRAIN_PLUG_SURFACE_OFFSET_MM = 10; // push plug slightly outwards from pontoon face
const DRAIN_PLUG_VERTICAL_OFFSET_MM = -80; // relative to pontoon center (negative = towards waterline)
const HOVER_CELL_SURFACE_OFFSET_MM = CoordinateCalculator.CONSTANTS.PONTOON_HEIGHT_MM / 2 + 5; // ~deck height plus margin
const EDGE_LUG_PLANE_OFFSET_MM = 72.6; // Lug plane (through-holes) is ~72.6mm above pontoon center in the CAD model

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

interface PontoonInstanceMeta {
  instanced: THREE.InstancedMesh;
  type: PontoonType;
  color: PontoonColor;
  scaleFactor: number;
  centerOffset: THREE.Vector3;
  baseQuaternion: THREE.Quaternion;
  capacity: number;
  baseGeometry: THREE.BufferGeometry;
}

export class RenderingEngine {
  private scene: THREE.Scene;
  private calculator: CoordinateCalculator;
  
  // Object groups for efficient management
  private pontoonGroup: THREE.Group;
  private connectorGroup: THREE.Group;
  private drainGroup: THREE.Group;
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
  private pontoonMaterialCacheKeyPrefix = 'pontoon-standard-';
  private pontoonInstanceMeta = new Map<string, PontoonInstanceMeta>();
  
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
      showPlacementDebug: false,
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
    placementDebugData?: PlacementDebugData,
    hoveredPosition?: GridPosition | null
  ): Promise<void> {
    const startTime = performance.now();
    
    // Update grid if changed
    if (this.currentGrid !== grid) {
      this.renderGrid(grid, currentLevel);
      await this.renderPontoons(grid);
      await this.renderConnectors(grid);
      await this.renderDrainPlugs(grid);
      this.currentGrid = grid;
    }
    // Update placement debug overlay each frame
    if (this.currentOptions.showPlacementDebug && placementDebugData?.cells?.length) {
      this.renderPlacementDebug(grid, placementDebugData.cells);
    } else {
      this.clearPlacementDebug();
    }
    
    // Update preview and hovered-cell outline
    if (previewData && this.currentOptions.showPreview) {
      this.renderPreview(previewData);
    } else {
      this.clearPreview();
    }

    if (hoveredPosition) {
      this.renderHoveredCell(hoveredPosition);
    } else {
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
      const hoverY = world.y + HOVER_CELL_SURFACE_OFFSET_MM / CoordinateCalculator.CONSTANTS.PRECISION_FACTOR;
      const outline = new THREE.Mesh(this.getGeometry('cell-plane'), this.getMaterial('cell-outline'));
      outline.position.set(world.x, hoverY + 0.0005, world.z);
      outline.rotation.x = -Math.PI / 2;
      this.hoverCellGroup.add(outline);

      const fill = new THREE.Mesh(this.getGeometry('cell-plane'), this.getMaterial('cell-fill'));
      fill.position.set(world.x, hoverY, world.z);
      fill.rotation.x = -Math.PI / 2;
      this.hoverCellGroup.add(fill);
    } catch (error) {
      console.warn('RenderingEngine: failed to render hovered cell', error);
    }
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
    } catch (error) {
      console.warn('RenderingEngine: failed to render placement debug overlay', error);
    }
  }

  private clearPlacementDebug(): void {
    this.clearGroup(this.placementDebugGroup);
  }

  /**
   * Render all pontoons
   */
  private async renderPontoons(grid: Grid): Promise<void> {
    if (this.currentOptions.use3DModels) {
      await this.renderPontoonsInstanced(grid);
    } else {
      this.renderPontoonBoxes(grid);
    }
  }

  private async renderPontoonsInstanced(grid: Grid): Promise<void> {
    if (this.pontoonInstanceMeta.size === 0 && this.pontoonGroup.children.length > 0) {
      this.clearGroup(this.pontoonGroup);
    }

    const groups = new Map<string, Pontoon[]>();
    for (const pontoon of grid.pontoons.values()) {
      const key = this.getPontoonInstanceKey(pontoon.type, pontoon.color);
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(pontoon);
      } else {
        groups.set(key, [pontoon]);
      }
    }

    const staleKeys = new Set(this.pontoonInstanceMeta.keys());
    const yAxis = new THREE.Vector3(0, 1, 0);
    const rotationQuaternion = new THREE.Quaternion();
    const totalQuaternion = new THREE.Quaternion();
    const matrix = new THREE.Matrix4();
    const translation = new THREE.Vector3();
    const scaleVector = new THREE.Vector3();

    for (const [key, pontoons] of groups.entries()) {
      staleKeys.delete(key);

      const sample = pontoons[0];
      const meta = await this.ensurePontoonInstanceMeta(key, sample.type, sample.color, pontoons.length);
      if (!meta) {
        // Fallback to discrete meshes if instancing is unavailable for this type
        const worldPromises = pontoons.map(async pontoon => {
          const worldPos = grid.gridToWorld(pontoon.position);
          await this.render3DPontoon(pontoon, worldPos);
        });
        await Promise.all(worldPromises);
        continue;
      }

      const updatedMeta = pontoons.length > meta.capacity
        ? this.rebuildPontoonInstanceMeta(meta, pontoons.length)
        : meta;

      if (updatedMeta !== meta) {
        this.pontoonInstanceMeta.set(key, updatedMeta);
      }

      const instanced = updatedMeta.instanced;
      scaleVector.setScalar(updatedMeta.scaleFactor);

      for (let index = 0; index < pontoons.length; index++) {
        const pontoon = pontoons[index];
        const positioned = this.applyFootprintOffsetByType(
          pontoon.type,
          pontoon.rotation,
          grid.gridToWorld(pontoon.position)
        );

        translation.set(
          positioned.x - updatedMeta.centerOffset.x,
          positioned.y - updatedMeta.centerOffset.y,
          positioned.z - updatedMeta.centerOffset.z
        );

        rotationQuaternion.setFromAxisAngle(yAxis, THREE.MathUtils.degToRad(pontoon.rotation));
        totalQuaternion.copy(updatedMeta.baseQuaternion).multiply(rotationQuaternion);

        matrix.compose(translation, totalQuaternion, scaleVector);
        instanced.setMatrixAt(index, matrix);
      }

      instanced.count = pontoons.length;
      instanced.instanceMatrix.needsUpdate = true;
    }

    for (const staleKey of staleKeys) {
      this.removePontoonInstance(staleKey);
    }
  }

  private renderPontoonBoxes(grid: Grid): void {
    this.disposePontoonInstances();
    this.clearGroup(this.pontoonGroup);
    for (const pontoon of grid.pontoons.values()) {
      const worldPos = grid.gridToWorld(pontoon.position);
      this.renderBoxPontoon(pontoon, worldPos);
    }
  }

  private async ensurePontoonInstanceMeta(
    key: string,
    type: PontoonType,
    color: PontoonColor,
    requiredCount: number
  ): Promise<PontoonInstanceMeta | null> {
    let meta = this.pontoonInstanceMeta.get(key);
    if (meta) {
      return meta;
    }

    const modelInfo = await this.load3DModel(type).catch(() => null);
    if (!modelInfo) {
      return null;
    }

    const mergedGeometry = modelLoader.getMergedGeometry(type);
    if (!mergedGeometry) {
      return null;
    }

    const capacity = Math.max(requiredCount, 1);
    const geometry = mergedGeometry.clone();
    const material = this.getSharedPontoonMaterial(color);
    const instanced = new THREE.InstancedMesh(geometry, material, capacity);
    instanced.name = `pontoon-${type}-${color}-instances`;
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pontoonGroup.add(instanced);

    const scaleFactor = modelLoader.calculateScaleFactorByHeight(modelInfo, 400);
    const centerOffset = modelInfo.center.clone().multiplyScalar(scaleFactor);
    const baseQuaternion = modelInfo.baseQuaternion.clone();

    meta = {
      instanced,
      type,
      color,
      scaleFactor,
      centerOffset,
      baseQuaternion,
      capacity,
      baseGeometry: mergedGeometry
    };

    this.pontoonInstanceMeta.set(key, meta);
    return meta;
  }

  private rebuildPontoonInstanceMeta(meta: PontoonInstanceMeta, requiredCount: number): PontoonInstanceMeta {
    this.pontoonGroup.remove(meta.instanced);
    meta.instanced.geometry.dispose();

    const newCapacity = Math.max(requiredCount, meta.capacity * 2);
    const geometry = meta.baseGeometry.clone();
    const material = this.getSharedPontoonMaterial(meta.color);
    const instanced = new THREE.InstancedMesh(geometry, material, newCapacity);
    instanced.name = `pontoon-${meta.type}-${meta.color}-instances`;
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pontoonGroup.add(instanced);

    return {
      ...meta,
      instanced,
      capacity: newCapacity
    };
  }

  private removePontoonInstance(key: string): void {
    const meta = this.pontoonInstanceMeta.get(key);
    if (!meta) return;
    this.pontoonGroup.remove(meta.instanced);
    meta.instanced.geometry.dispose();
    this.pontoonInstanceMeta.delete(key);
  }

  private disposePontoonInstances(): void {
    for (const key of [...this.pontoonInstanceMeta.keys()]) {
      this.removePontoonInstance(key);
    }
  }

  private getPontoonInstanceKey(type: PontoonType, color: PontoonColor): string {
    return `${type}-${color}`;
  }

  /**
   * Render automatically generated connectors between adjacent pontoons
   */
  private async renderConnectors(grid: Grid): Promise<void> {
    this.clearGroup(this.connectorGroup);

    const placements = computeConnectorPlacements(grid, { calculator: this.calculator });
    if (placements.length === 0) {
      return;
    }

    const interiorPlacements = placements.filter(p => p.lugCount >= 4);
    const edgePlacements = placements.filter(p => p.lugCount >= 1 && p.lugCount <= 3);

    if (interiorPlacements.length) {
      try {
        const groupedByVariant: Record<ConnectorVariant, ConnectorPlacement[]> = {
          standard: [],
          long: []
        };

        for (const placement of interiorPlacements) {
          const variant: ConnectorVariant = determineConnectorVariant(placement);
          groupedByVariant[variant].push(placement);
        }

        for (const variant of Object.keys(groupedByVariant) as ConnectorVariant[]) {
          const variantPlacements = groupedByVariant[variant];
          if (!variantPlacements.length) continue;

          const modelInfo = await this.loadConnectorModel(variant);
          const targetHeight = variant === 'long' ? CONNECTOR_LONG_HEIGHT_MM : CONNECTOR_STANDARD_HEIGHT_MM;
          const scaleFactor = this.getScaleFactorForHardware(`connector-${variant}`, modelInfo, targetHeight);
          const connectorHeightM = modelInfo.dimensions.y * scaleFactor;

          for (const placement of variantPlacements) {
            console.debug('RenderingEngine: placing connector', {
              variant,
              level: placement.level,
              hasLowerSupport: placement.hasLowerSupport,
              lugCount: placement.lugCount,
              targetHeight,
              rawHeight: modelInfo.dimensions.y,
              scaledHeightM: connectorHeightM
            });
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

  private async renderDrainPlugs(grid: Grid): Promise<void> {
    this.clearGroup(this.drainGroup);

    if (!this.currentOptions.use3DModels || grid.pontoons.size === 0) {
      return;
    }

    let drainInfo: ModelInfo;
    try {
      drainInfo = await modelLoader.loadDrainPlug();
    } catch (error) {
      console.warn('RenderingEngine: Failed to load drain plug model – skipping.', error);
      return;
    }

    const scaleFactor = this.getScaleFactorForHardware('drain-plug', drainInfo, DRAIN_PLUG_HEIGHT_MM);
    const cellSizeM = CoordinateCalculator.CONSTANTS.CELL_SIZE_MM / CoordinateCalculator.CONSTANTS.PRECISION_FACTOR;
    const surfaceOffsetM = DRAIN_PLUG_SURFACE_OFFSET_MM / 1000;
    const verticalOffsetM = DRAIN_PLUG_VERTICAL_OFFSET_MM / 1000;

    const localForwardOffset = cellSizeM / 2 + surfaceOffsetM;
    const rotationAxis = new THREE.Vector3(0, 1, 0);

    for (const pontoon of grid.pontoons.values()) {
      const baseWorld = grid.gridToWorld(pontoon.position);
      const baseWorldVector = new THREE.Vector3(baseWorld.x, baseWorld.y, baseWorld.z);
      const center = this.applyFootprintOffsetByType(pontoon.type, pontoon.rotation, baseWorldVector);

      const localOffset = new THREE.Vector3(0, verticalOffsetM, localForwardOffset);
      const rotationRadians = THREE.MathUtils.degToRad(pontoon.rotation);
      localOffset.applyAxisAngle(rotationAxis, rotationRadians);

      const position = new THREE.Vector3(
        center.x + localOffset.x,
        center.y + localOffset.y,
        center.z + localOffset.z
      );

      const plugMesh = modelLoader.cloneModel(drainInfo);
      modelLoader.prepareModelForGrid(plugMesh, position, drainInfo, scaleFactor);
      plugMesh.rotation.y = rotationRadians;
      plugMesh.userData = {
        pontoonId: pontoon.id,
        variant: 'drain-plug'
      };
      this.drainGroup.add(plugMesh);
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
      } catch (error) {
        console.debug('RenderingEngine: pontoon overhang computation skipped', error);
      }
      
      // Apply color/material to match pontoon color using shared cache
      const sharedMaterial = this.getSharedPontoonMaterial(pontoon.color);
      pontoonMesh.traverse((obj: any) => {
        if (obj && obj.isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.material = sharedMaterial;
        }
      });
      
      // Set user data
      pontoonMesh.userData = { pontoonId: pontoon.id, pontoon };
      
      const baseQuaternion = modelInfo.baseQuaternion ?? pontoonMesh.quaternion.clone();
      const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        THREE.MathUtils.degToRad(pontoon.rotation)
      );
      pontoonMesh.setRotationFromQuaternion(baseQuaternion.clone().multiply(rotationQuaternion));
      
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
    const deckOffsetM = EDGE_LUG_PLANE_OFFSET_MM / 1000;

    for (const placement of placements) {
      const base = placement.worldPosition;
      const levelCenterM = placement.level * pontoonHeightM;
      const deckPlaneM = levelCenterM + deckOffsetM;

      const useDoubleSpacer = placement.lugCount <= 2;
      const spacerInfo = useDoubleSpacer ? spacerDoubleInfo : spacerSingleInfo;
      const spacerScale = useDoubleSpacer ? spacerDoubleScale : spacerSingleScale;
      const spacerHeightM = spacerInfo.dimensions.y * spacerScale;

      // Bolt (includes head) - top aligns with top of nut for visual clarity
      const boltMesh = modelLoader.cloneModel(boltInfo);
      const boltPositionY = this.computeModelPositionForPlane(boltInfo, boltScale, 0, deckPlaneM);
      modelLoader.prepareModelForGrid(boltMesh, new THREE.Vector3(base.x, boltPositionY, base.z), boltInfo, boltScale);
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
        const spacerPositionY = this.computeModelPositionForPlane(spacerInfo, spacerScale, 0, deckPlaneM);
        modelLoader.prepareModelForGrid(spacerMesh, new THREE.Vector3(base.x, spacerPositionY, base.z), spacerInfo, spacerScale);
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
      const nutCompressionM = Math.min(spacerHeightM, EDGE_NUT_COMPRESSION_MM / 1000);
      const nutBaseM = deckPlaneM + spacerHeightM - nutCompressionM;
      const nutPositionY = this.computeModelPositionForPlane(nutInfo, nutScale, 0, nutBaseM);
      modelLoader.prepareModelForGrid(nutMesh, new THREE.Vector3(base.x, nutPositionY, base.z), nutInfo, nutScale);
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

  private computeModelPositionForPlane(
    modelInfo: ModelInfo,
    scaleFactor: number,
    modelPlaneY: number,
    targetWorldY: number
  ): number {
    const centerY = modelInfo.center.y;
    return targetWorldY - (modelPlaneY - centerY) * scaleFactor;
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
      const positioned = this.applyFootprintOffsetByType(pontoon.type, pontoon.rotation, worldPos);
      const geometry = this.getGeometry('selection-outline');
      const material = this.getMaterial('selection');
      
      const outline = new THREE.Mesh(geometry, material);
      outline.position.set(positioned.x, positioned.y, positioned.z);

      const typeConfig = getPontoonTypeConfig(pontoon.type);
      const cellSizeM = CoordinateCalculator.CONSTANTS.CELL_SIZE_MM / 1000;
      let sizeX = typeConfig.gridSize.x;
      let sizeZ = typeConfig.gridSize.z;
      if (pontoon.rotation === Rotation.EAST || pontoon.rotation === Rotation.WEST) {
        const tmp = sizeX;
        sizeX = sizeZ;
        sizeZ = tmp;
      }

      const outlineWidth = sizeX * cellSizeM;
      const outlineDepth = sizeZ * cellSizeM;
      const baseWidth = 0.55; // geometry width defined in createGeometries()
      const baseDepth = 0.55;
      const margin = 1.08; // slight enlargement for readability

      outline.scale.set(
        (outlineWidth * margin) / baseWidth,
        1.05,
        (outlineDepth * margin) / baseDepth
      );
      if (pontoon.rotation !== Rotation.NORTH) {
        outline.rotation.y = THREE.MathUtils.degToRad(pontoon.rotation);
      }
      
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

      if (child instanceof THREE.Mesh) {
        const { geometry, material } = child;

        if (geometry && !this.isCachedGeometry(geometry)) {
          geometry.dispose();
        }

        if (Array.isArray(material)) {
          for (const mat of material) {
            if (mat && mat instanceof THREE.Material && !this.isCachedMaterial(mat)) {
              mat.dispose();
            }
          }
        } else if (material instanceof THREE.Material && !this.isCachedMaterial(material)) {
          material.dispose();
        }
      }
    }
  }

  private isCachedGeometry(geometry: THREE.BufferGeometry): boolean {
    for (const cachedGeometry of this.geometryCache.values()) {
      if (cachedGeometry === geometry) {
        return true;
      }
    }
    return false;
  }

  private isCachedMaterial(material: THREE.Material): boolean {
    for (const cachedMaterial of this.materialCache.values()) {
      if (cachedMaterial === material) {
        return true;
      }
    }
    return false;
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

    this.drainGroup = new THREE.Group();
    this.drainGroup.name = 'drain-plugs';
    this.scene.add(this.drainGroup);
    
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
    const hoverMaterialProps = { depthTest: false, depthWrite: false } as const;
    this.materialCache.set('cell-outline', new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      wireframe: true,
      ...hoverMaterialProps
    }));
    this.materialCache.set('cell-fill', new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      transparent: true,
      opacity: 0.18,
      ...hoverMaterialProps
    }));

    // Placement debug materials (used to visualize latest drop location)
    this.materialCache.set('placement-outline', new THREE.MeshBasicMaterial({ color: 0xff3366, wireframe: true }));
    this.materialCache.set('placement-fill', new THREE.MeshBasicMaterial({ color: 0xff3366, transparent: true, opacity: 0.18 }));
  }

  private getSharedPontoonMaterial(color: PontoonColor): THREE.MeshStandardMaterial {
    const key = `${this.pontoonMaterialCacheKeyPrefix}${color}`;
    let material = this.materialCache.get(key) as THREE.MeshStandardMaterial | undefined;
    if (!material) {
      const colorHex = getPontoonColorConfig(color).hex;
      material = new THREE.MeshStandardMaterial({ color: colorHex });
      material.metalness = 0.0;
      material.roughness = 0.9;
      this.materialCache.set(key, material);
    }
    return material;
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

    if (!use3D) {
      this.disposePontoonInstances();
    }
    
    // Force re-render if grid is provided
    if (grid) {
      this.currentGrid = null; // Force refresh
      await this.renderPontoons(grid);
      await this.renderConnectors(grid);
      await this.renderDrainPlugs(grid);
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
    this.disposePontoonInstances();
    this.clearGroup(this.pontoonGroup);
    this.clearGroup(this.connectorGroup);
    this.clearGroup(this.drainGroup);
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
