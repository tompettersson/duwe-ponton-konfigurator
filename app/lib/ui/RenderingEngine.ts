/**
 * RenderingEngine - Three.js Integration with Domain Layer
 *
 * Handles all 3D rendering using the new domain architecture
 * Replaces scattered rendering logic with centralized engine
 */

import * as THREE from "three";
import {
  Grid,
  GridPosition,
  Pontoon,
  PontoonType,
  PontoonColor,
  Rotation,
  CoordinateCalculator,
  getPontoonTypeConfig,
  getPontoonColorConfig,
} from "../domain";
import { modelLoader, type ModelInfo } from "./ModelLoader";
import {
  SHOWCASE_ASSETS,
  type ShowcaseAssetDefinition,
} from "./showcaseAssets";
import { type AccessoryPlacement } from "./accessoryPlanner";
import {
  computeConnectorPlacements,
  determineConnectorVariant,
  type ConnectorPlacement,
  type ConnectorVariant,
} from "./connectorPlanner";

const CONNECTOR_STANDARD_HEIGHT_MM = 240; // Four stacked lugs (~60mm each) for a single-layer pin
const CONNECTOR_LONG_HEIGHT_MM =
  CONNECTOR_STANDARD_HEIGHT_MM +
  CoordinateCalculator.CONSTANTS.PONTOON_HEIGHT_MM; // span one extra pontoon height
const CONNECTOR_HEAD_ABOVE_TOP_MM = -10; // User requested -10mm offset (was 0) to lower head slightly below deck
const EDGE_CONNECTOR_BOLT_HEIGHT_MM = 105;
const EDGE_CONNECTOR_NUT_HEIGHT_MM = 30;
const EDGE_SPACER_DOUBLE_HEIGHT_MM = 32;
const EDGE_SPACER_SINGLE_HEIGHT_MM = 16;
const EDGE_NUT_COMPRESSION_MM = 3; // Allow nut to compress washer stack slightly so it sits flush
const SINGLE_PONTOON_VERTICAL_OFFSET_MM = -10;
const SINGLE_PONTOON_VERTICAL_OFFSET_M =
  SINGLE_PONTOON_VERTICAL_OFFSET_MM / 1000;
const DRAIN_PLUG_HEIGHT_MM = 35;
const DRAIN_PLUG_SURFACE_OFFSET_MM = 10; // push plug slightly outwards from pontoon face
const DRAIN_PLUG_VERTICAL_OFFSET_MM = 60; // relative to pontoon center (positive = towards deck)
const DRAIN_PLUG_INSERT_MM = 15; // default insertion depth
const DRAIN_PLUG_INSERT_BY_TYPE_MM: Record<PontoonType, number> = {
  [PontoonType.SINGLE]: 10,
  [PontoonType.DOUBLE]: 15,
};
const DRAIN_PLUG_VERTICAL_OFFSET_BY_TYPE_MM: Record<PontoonType, number> = {
  [PontoonType.SINGLE]: 65,
  [PontoonType.DOUBLE]: 60,
};
const HOVER_CELL_SURFACE_OFFSET_MM =
  CoordinateCalculator.CONSTANTS.PONTOON_HEIGHT_MM / 2 + 5; // ~deck height plus margin
const EDGE_LUG_PLANE_OFFSET_MM = 72.6; // Lug plane (through-holes) is ~72.6mm above pontoon center in the CAD model
const PREVIEW_SURFACE_EPSILON_M = 0.002; // Lift previews slightly to prevent z-fighting with deck
const PREVIEW_SCALE_FACTOR = 0.998; // Shrink preview mesh marginally so edges do not overlap
const STANDARD_CONNECTOR_COLOR_HEX = "#4a75d6"; // Default plastic connector color (legacy blue tone)
const CELL_SIZE_M =
  CoordinateCalculator.CONSTANTS.CELL_SIZE_MM /
  CoordinateCalculator.CONSTANTS.PRECISION_FACTOR;
const LADDER_BRACKET_RADIUS_M = 0.06;
const LADDER_BRACKET_HEIGHT_M = 0.14;
const DEBUG_ENABLE_DRAIN_MARKERS = false;
const DRAIN_MARKER_RADIUS_M = 0.045;
// Toggle these to show/hide debug visualizations for lugs and orientation
const DEBUG_ENABLE_LUG_MARKERS = false;
const DEBUG_ENABLE_ORIENTATION_MARKERS = false;
const LUG_MARKER_RADIUS_M = 0.035;
const LUG_LAYER_COLORS: Record<number, string> = {
  1: "#4cc0ff", // Bottom - Blue
  2: "#90ee90", // Middle-Low - Light Green
  3: "#ffd700", // Middle-High - Gold
  4: "#ff7f50", // Top - Coral
};
const LUG_LABEL_TEXT_COLOR = "#000000";
const CONNECTOR_LOCK_ROTATION_RAD = Math.PI / 4;

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
  private accessoryGroup: THREE.Group;
  private showcaseGroup: THREE.Group;
  private lugDebugGroup: THREE.Group;
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
  private pontoonMaterialCacheKeyPrefix = "pontoon-standard-";
  private pontoonInstanceMeta = new Map<string, PontoonInstanceMeta>();
  private pontoonBaseQuaternionCache = new Map<PontoonType, THREE.Quaternion>();
  private lugLabelTextureCache = new Map<string, THREE.CanvasTexture>();
  private showcaseAssetCache = new Map<
    string,
    { info: ModelInfo; scale: number; dimensions: THREE.Vector3 }
  >();
  private labelCanvasCache = new Map<
    string,
    { texture: THREE.CanvasTexture; width: number; height: number }
  >();

  // Rendering state
  private currentGrid: Grid | null = null;
  private currentOptions: RenderingOptions;
  private disposed = false;
  private showcaseVisible = false;
  private showcaseNeedsRefresh = false;

  // Performance tracking
  private renderStats = {
    totalRenders: 0,
    pontoonCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
  };

  constructor(scene: THREE.Scene, options: Partial<RenderingOptions> = {}) {
    this.scene = scene;
    this.calculator = new CoordinateCalculator();
    this.disposed = false;

    // Default rendering options
    this.currentOptions = {
      showGrid: true,
      showPreview: true,
      showSelection: true,
      showSupport: false,
      showPlacementDebug: false,
      gridOpacity: 0.3,
      previewOpacity: 0.6,
      selectionColor: "#ffff00",
      supportColor: "#00ff00",
      use3DModels: true, // Use 3D models by default
      ...options,
    };

    this.initializeGroups();
    this.createMaterials();
    this.createGeometries();

    console.log("🎨 RenderingEngine: Initialized with Three.js scene");
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
    hoveredPosition?: GridPosition | null,
    accessoryPlacements: AccessoryPlacement[] = [],
    highlightedAccessoryId?: string | null,
    placedAccessoryPlacements: AccessoryPlacement[] = []
  ): Promise<void> {
    if (this.disposed) {
      console.warn(
        "🎨 RenderingEngine: render() called after dispose; ignoring frame"
      );
      return;
    }
    const startTime = performance.now();

    // Update grid if changed
    if (this.currentGrid !== grid) {
      this.renderGrid(grid, currentLevel);
      await this.renderPontoons(grid);
      await this.renderConnectors(grid);
      await this.renderDrainPlugs(grid);
      if (this.showcaseVisible) {
        await this.renderShowcaseAssets(grid);
      }
      this.currentGrid = grid;
    }
    // Update placement debug overlay each frame
    if (
      this.currentOptions.showPlacementDebug &&
      placementDebugData?.cells?.length
    ) {
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

    this.renderAccessories(
      accessoryPlacements,
      placedAccessoryPlacements,
      highlightedAccessoryId ?? null
    );

    if (this.showcaseVisible && this.showcaseNeedsRefresh) {
      await this.renderShowcaseAssets(grid);
    }

    // Update statistics
    const renderTime = performance.now() - startTime;
    this.updateRenderStats(renderTime, grid.getPontoonCount());

    console.log(
      `🎨 RenderingEngine: Rendered frame (${renderTime.toFixed(2)}ms)`
    );
  }

  /**
   * Render grid system
   */
  private renderGrid(grid: Grid, currentLevel: number): void {
    this.clearGroup(this.gridGroup);

    if (!this.currentOptions.showGrid) return;

    const { width, height } = grid.dimensions;
    const material = this.getMaterial("grid");
    const levelY = this.calculator.getLevelPhysicalY(currentLevel) / 1000; // Convert to meters

    // Create grid lines
    const gridGeometry = new THREE.BufferGeometry();
    const positions: number[] = [];

    // Vertical lines (X direction)
    for (let x = 0; x <= width; x++) {
      const worldX = (x - width / 2) * 0.5; // 0.5m grid spacing
      positions.push(worldX, levelY, -height * 0.25); // Start
      positions.push(worldX, levelY, height * 0.25); // End
    }

    // Horizontal lines (Z direction)
    for (let z = 0; z <= height; z++) {
      const worldZ = (z - height / 2) * 0.5;
      positions.push(-width * 0.25, levelY, worldZ); // Start
      positions.push(width * 0.25, levelY, worldZ); // End
    }

    gridGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    const gridLines = new THREE.LineSegments(gridGeometry, material);
    this.gridGroup.add(gridLines);

    // Add level indicator
    this.addLevelIndicator(currentLevel, levelY);
  }

  /** Show the exact hovered grid cell as an outline + light fill */
  private renderHoveredCell(position: GridPosition): void {
    this.clearGroup(this.hoverCellGroup);
    try {
      const dims =
        this.currentGrid?.dimensions ??
        ({ width: 50, height: 50, levels: 3 } as any);
      const world = this.calculator.gridToWorld(position, dims);
      const hoverY =
        world.y +
        HOVER_CELL_SURFACE_OFFSET_MM /
          CoordinateCalculator.CONSTANTS.PRECISION_FACTOR;
      const outline = new THREE.Mesh(
        this.getGeometry("cell-plane"),
        this.getMaterial("cell-outline")
      );
      outline.position.set(world.x, hoverY + 0.0005, world.z);
      outline.rotation.x = -Math.PI / 2;
      this.hoverCellGroup.add(outline);

      const fill = new THREE.Mesh(
        this.getGeometry("cell-plane"),
        this.getMaterial("cell-fill")
      );
      fill.position.set(world.x, hoverY, world.z);
      fill.rotation.x = -Math.PI / 2;
      this.hoverCellGroup.add(fill);
    } catch (error) {
      console.warn("RenderingEngine: failed to render hovered cell", error);
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

        const outline = new THREE.Mesh(
          this.getGeometry("cell-plane"),
          this.getMaterial("placement-outline")
        );
        outline.position.set(world.x, world.y + 0.0008, world.z);
        outline.rotation.x = -Math.PI / 2;
        this.placementDebugGroup.add(outline);

        const fill = new THREE.Mesh(
          this.getGeometry("cell-plane"),
          this.getMaterial("placement-fill")
        );
        fill.position.set(world.x, world.y + 0.0003, world.z);
        fill.rotation.x = -Math.PI / 2;
        this.placementDebugGroup.add(fill);
      }
    } catch (error) {
      console.warn(
        "RenderingEngine: failed to render placement debug overlay",
        error
      );
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
    if (
      this.pontoonInstanceMeta.size === 0 &&
      this.pontoonGroup.children.length > 0
    ) {
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
      const meta = await this.ensurePontoonInstanceMeta(
        key,
        sample.type,
        sample.color,
        pontoons.length
      );
      if (!meta) {
        // Fallback to discrete meshes if instancing is unavailable for this type
        const worldPromises = pontoons.map(async (pontoon) => {
          const worldPos = grid.gridToWorld(pontoon.position);
          await this.render3DPontoon(
            pontoon,
            new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z)
          );
        });
        await Promise.all(worldPromises);
        continue;
      }

      const updatedMeta =
        pontoons.length > meta.capacity
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
          new THREE.Vector3(
            grid.gridToWorld(pontoon.position).x,
            grid.gridToWorld(pontoon.position).y,
            grid.gridToWorld(pontoon.position).z
          )
        );

        translation.set(
          positioned.x - updatedMeta.centerOffset.x,
          positioned.y - updatedMeta.centerOffset.y,
          positioned.z - updatedMeta.centerOffset.z
        );

        rotationQuaternion.setFromAxisAngle(
          yAxis,
          THREE.MathUtils.degToRad(pontoon.rotation)
        );
        totalQuaternion
          .copy(updatedMeta.baseQuaternion)
          .multiply(rotationQuaternion);

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
      const basePos = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
      this.renderBoxPontoon(pontoon, basePos);
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

    const scaleFactor = modelLoader.calculateScaleFactorByHeight(
      modelInfo,
      400
    );
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
      baseGeometry: mergedGeometry,
    };

    this.pontoonInstanceMeta.set(key, meta);
    return meta;
  }

  private rebuildPontoonInstanceMeta(
    meta: PontoonInstanceMeta,
    requiredCount: number
  ): PontoonInstanceMeta {
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
      capacity: newCapacity,
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

  private getPontoonInstanceKey(
    type: PontoonType,
    color: PontoonColor
  ): string {
    return `${type}-${color}`;
  }

  private async getPontoonBaseQuaternion(
    type: PontoonType
  ): Promise<THREE.Quaternion> {
    const cached = this.pontoonBaseQuaternionCache.get(type);
    if (cached) {
      return cached.clone();
    }

    const modelInfo = await this.load3DModel(type);
    const baseQuat = modelInfo.baseQuaternion.clone();
    this.pontoonBaseQuaternionCache.set(type, baseQuat);
    return baseQuat.clone();
  }

  /**
   * Render automatically generated connectors between adjacent pontoons
   */
  private async renderConnectors(grid: Grid): Promise<void> {
    this.clearGroup(this.connectorGroup);

    const placements = computeConnectorPlacements(grid, {
      calculator: this.calculator,
    });
    if (placements.length === 0) {
      return;
    }

    const interiorPlacements = placements.filter((p) => p.lugCount >= 4);
    const edgePlacements = placements.filter(
      (p) => p.lugCount >= 1 && p.lugCount <= 3
    );

    if (interiorPlacements.length) {
      await this.renderInteriorConnectorsInstanced(interiorPlacements);
    }

    if (edgePlacements.length) {
      await this.renderEdgeConnectors(edgePlacements);
    }
  }

  private async renderInteriorConnectorsInstanced(
    placements: ConnectorPlacement[]
  ): Promise<void> {
    const grouped: Record<ConnectorVariant, ConnectorPlacement[]> = {
      standard: [],
      long: [],
    };

    for (const placement of placements) {
      const variant = determineConnectorVariant(placement);
      grouped[variant].push(placement);
    }

    const matrix = new THREE.Matrix4();
    const translation = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const lockQuaternion = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      CONNECTOR_LOCK_ROTATION_RAD
    );

    for (const variant of Object.keys(grouped) as ConnectorVariant[]) {
      const bucket = grouped[variant];
      if (!bucket.length) continue;

      const modelInfo = await this.loadConnectorModel(variant);
      const lockedBaseQuaternion = modelInfo.baseQuaternion
        .clone()
        .multiply(lockQuaternion);
      if (!modelInfo.mergedGeometry) {
        await Promise.all(
          bucket.map(async (placement) => {
            const fallback = modelLoader.cloneModel(modelInfo);
            const targetHeight =
              variant === "long"
                ? CONNECTOR_LONG_HEIGHT_MM
                : CONNECTOR_STANDARD_HEIGHT_MM;
            const scaleFactor = this.getScaleFactorForHardware(
              `connector-${variant}`,
              modelInfo,
              targetHeight
            );
            const connectorHeightM = modelInfo.dimensions.y * scaleFactor;
            const position = placement.worldPosition.clone();
            position.y = this.getConnectorCenterY(
              placement.level,
              connectorHeightM
            );
            modelLoader.prepareModelForGrid(
              fallback,
              position,
              modelInfo,
              scaleFactor
            );
            fallback.setRotationFromQuaternion(lockedBaseQuaternion.clone());
            this.connectorGroup.add(fallback);
          })
        );
        continue;
      }

      const targetHeight =
        variant === "long"
          ? CONNECTOR_LONG_HEIGHT_MM
          : CONNECTOR_STANDARD_HEIGHT_MM;
      const scaleFactor = this.getScaleFactorForHardware(
        `connector-${variant}`,
        modelInfo,
        targetHeight
      );
      scale.setScalar(scaleFactor);

      const instanced = new THREE.InstancedMesh(
        modelInfo.mergedGeometry.clone(),
        this.getSharedHardwareMaterial("connector"),
        bucket.length
      );
      instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      instanced.name = `connector-${variant}-instances`;

      const centerOffset = modelInfo.center.clone().multiplyScalar(scaleFactor);
      const connectorHeightM = modelInfo.dimensions.y * scaleFactor;

      for (let index = 0; index < bucket.length; index++) {
        const placement = bucket[index];
        const base = placement.worldPosition;
        const centerY = this.getConnectorCenterY(
          placement.level,
          connectorHeightM
        );
        translation.set(base.x, centerY, base.z).sub(centerOffset);
        matrix.compose(translation, lockedBaseQuaternion, scale);
        instanced.setMatrixAt(index, matrix);
      }

      instanced.count = bucket.length;
      instanced.instanceMatrix.needsUpdate = true;
      this.connectorGroup.add(instanced);
    }
  }

  private async renderDrainPlugs(grid: Grid): Promise<void> {
    this.clearGroup(this.drainGroup);
    if (DEBUG_ENABLE_LUG_MARKERS) {
      this.clearGroup(this.lugDebugGroup);
    }

    if (!this.currentOptions.use3DModels || grid.pontoons.size === 0) {
      return;
    }

    let drainInfo: ModelInfo;
    try {
      drainInfo = await modelLoader.loadDrainPlug();
    } catch (error) {
      console.warn(
        "RenderingEngine: Failed to load drain plug model – skipping.",
        error
      );
      return;
    }

    const scaleFactor = this.getScaleFactorForHardware(
      "drain-plug",
      drainInfo,
      DRAIN_PLUG_HEIGHT_MM
    );
    const cellSizeM =
      CoordinateCalculator.CONSTANTS.CELL_SIZE_MM /
      CoordinateCalculator.CONSTANTS.PRECISION_FACTOR;
    const surfaceOffsetM = DRAIN_PLUG_SURFACE_OFFSET_MM / 1000;

    const rotationAxis = new THREE.Vector3(0, 1, 0);
    const canonicalOutward = new THREE.Vector3(1, 0, 0);
    const drainAxisLocal = new THREE.Vector3(0, 1, 0);
    const drainBaseQuaternion = drainInfo.baseQuaternion.clone();
    const drainAxisWorldBase = drainAxisLocal
      .clone()
      .applyQuaternion(drainBaseQuaternion);
    const baseQuaternionCache = new Map<PontoonType, THREE.Quaternion>();

    for (const pontoon of grid.pontoons.values()) {
      const baseWorld = grid.gridToWorld(pontoon.position);
      const baseWorldVector = new THREE.Vector3(
        baseWorld.x,
        baseWorld.y,
        baseWorld.z
      );
      const center = this.applyFootprintOffsetByType(
        pontoon.type,
        pontoon.rotation,
        baseWorldVector
      );

      const typeConfig = getPontoonTypeConfig(pontoon.type);
      const verticalOffsetMM =
        DRAIN_PLUG_VERTICAL_OFFSET_BY_TYPE_MM[pontoon.type] ??
        DRAIN_PLUG_VERTICAL_OFFSET_MM;
      const verticalOffsetM = verticalOffsetMM / 1000;
      const insertOffsetMM =
        DRAIN_PLUG_INSERT_BY_TYPE_MM[pontoon.type] ?? DRAIN_PLUG_INSERT_MM;
      const insertOffsetM = insertOffsetMM / 1000;
      const halfWidth = (typeConfig.gridSize.x * cellSizeM) / 2;
      const horizontalDistance = halfWidth + surfaceOffsetM - insertOffsetM;

      let baseQuaternion = baseQuaternionCache.get(pontoon.type);
      if (!baseQuaternion) {
        baseQuaternion = await this.getPontoonBaseQuaternion(pontoon.type);
        baseQuaternionCache.set(pontoon.type, baseQuaternion.clone());
      } else {
        baseQuaternion = baseQuaternion.clone();
      }

      const rotationRadians = THREE.MathUtils.degToRad(pontoon.rotation);
      const combinedQuaternion = baseQuaternion
        .clone()
        .multiply(
          new THREE.Quaternion().setFromAxisAngle(rotationAxis, rotationRadians)
        );

      const outwardDirection = canonicalOutward
        .clone()
        .applyQuaternion(combinedQuaternion)
        .setY(0);

      if (outwardDirection.lengthSq() < 1e-6) {
        outwardDirection.set(1, 0, 0);
      }

      outwardDirection.normalize();

      const position = new THREE.Vector3(
        center.x + outwardDirection.x * horizontalDistance,
        center.y + verticalOffsetM,
        center.z + outwardDirection.z * horizontalDistance
      );

      const plugMesh = modelLoader.cloneModel(drainInfo);
      modelLoader.prepareModelForGrid(
        plugMesh,
        position,
        drainInfo,
        scaleFactor
      );

      const alignQuaternion = new THREE.Quaternion().setFromUnitVectors(
        drainAxisWorldBase.clone().normalize(),
        outwardDirection.clone().multiplyScalar(-1)
      );
      const finalQuaternion = alignQuaternion.multiply(
        drainBaseQuaternion.clone()
      );
      plugMesh.setRotationFromQuaternion(finalQuaternion);

      const drainMaterial = this.getSharedPontoonMaterial(pontoon.color);
      plugMesh.traverse((obj: any) => {
        if (obj && obj.isMesh) {
          (obj as THREE.Mesh).material = drainMaterial;
        }
      });
      plugMesh.userData = {
        pontoonId: pontoon.id,
        variant: "drain-plug",
      };
      this.drainGroup.add(plugMesh);

      if (DEBUG_ENABLE_DRAIN_MARKERS) {
        const markerGeometry = this.getGeometry("drain-marker");
        const markerMaterial = this.getMaterial("debug-drain-marker");
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(
          position.x,
          position.y + DRAIN_MARKER_RADIUS_M * 1.6,
          position.z
        );
        marker.userData = { debug: "drain-marker", pontoonId: pontoon.id };
        this.drainGroup.add(marker);
      }

      if (DEBUG_ENABLE_LUG_MARKERS) {
        this.renderLugMarkers(
          pontoon,
          combinedQuaternion,
          center,
          typeConfig.gridSize,
          cellSizeM
        );
      }

      if (DEBUG_ENABLE_ORIENTATION_MARKERS) {
        this.renderOrientationMarker(pontoon, grid);
      }
    }
  }

  private renderLugMarkers(
    pontoon: Pontoon,
    combinedQuaternion: THREE.Quaternion,
    center: THREE.Vector3,
    gridSize: { x: number; z: number },
    cellSizeM: number
  ): void {
    const halfWidthX = (gridSize.x * cellSizeM) / 2;
    const halfWidthZ = (gridSize.z * cellSizeM) / 2;
    const lugPlaneOffsetM = EDGE_LUG_PLANE_OFFSET_MM / 1000;

    // Iterate through all corners of the pontoon
    // We need to check each corner of the occupied grid cells
    // A pontoon of size X,Z has (X+1)*(Z+1) potential corners, but we only care about the outer ones usually.
    // However, the getLugLayerAt method works with global grid coordinates.

    // Let's iterate through the local corners relative to the pontoon
    // For a 1x1 pontoon, corners are (0,0), (1,0), (0,1), (1,1)
    // For a 2x1 pontoon, corners are (0,0), (1,0), (2,0)... etc.

    // We need to map these local corners to the physical 3D world relative to the center

    // Pontoon position (min corner) in world space
    // The 'center' passed here is the physical center of the pontoon.

    // Let's reconstruct the grid coordinates for the corners
    const config = getPontoonTypeConfig(pontoon.type);
    // Note: config.gridSize is unrotated. We need the effective size.
    // But getLugLayerAt handles rotation internally if we pass global grid coords.

    // We need to know the effective dimensions to iterate the correct range
    let effectiveSizeX = config.gridSize.x;
    let effectiveSizeZ = config.gridSize.z;

    if (
      pontoon.rotation === Rotation.EAST ||
      pontoon.rotation === Rotation.WEST
    ) {
      effectiveSizeX = config.gridSize.z;
      effectiveSizeZ = config.gridSize.x;
    }

    // Iterate over all corners
    for (let x = 0; x <= effectiveSizeX; x++) {
      for (let z = 0; z <= effectiveSizeZ; z++) {
        // Get the layer for this corner
        const globalGridX = pontoon.position.x + x;
        const globalGridZ = pontoon.position.z + z;

        const layer = pontoon.getLugLayerAt(globalGridX, globalGridZ);

        if (layer === null) continue; // No lug at this corner (internal corner or undefined)

        // Calculate physical position relative to center
        // Center is at (width/2, height/2) in local grid units
        const localGridCenterX = effectiveSizeX / 2;
        const localGridCenterZ = effectiveSizeZ / 2;

        const offsetX = (x - localGridCenterX) * cellSizeM;
        const offsetZ = (z - localGridCenterZ) * cellSizeM;

        // Apply rotation to the offset vector?
        // No, 'center' is already the rotated center, but the offsets x,z are aligned with the pontoon's local axes?
        // Wait, 'center' is the world position.
        // If we use the 'combinedQuaternion' (which includes rotation), we should calculate offsets in LOCAL space (unrotated)
        // and then apply the quaternion.

        // But here we are iterating in EFFECTIVE (rotated) grid space.
        // So x and z are already aligned with the world axes (relative to the pontoon's start position).
        // So we don't need to apply the quaternion if we just add to the world center?
        // NO. The 'center' includes the rotation offset.

        // Let's use a simpler approach:
        // 1. Calculate the world position of this specific corner directly from the grid
        // 2. Add the vertical offset

        // But we want to use the 'center' and 'quaternion' to be consistent with the pontoon mesh?
        // Actually, rendering markers at the exact grid corners is probably safer and more correct for debugging.

        // World X of corner = (GlobalGridX - Width/2) * CellSize ? No.
        // Grid (0,0) is at World (-Width/2, -Height/2) usually?
        // Let's look at renderGrid: worldX = (x - width/2) * 0.5

        // So:
        // const worldX = (globalGridX - grid.width/2) * cellSizeM;
        // const worldZ = (globalGridZ - grid.height/2) * cellSizeM;
        // This assumes the grid is centered at 0,0,0.

        // Let's try to use the passed 'center' and 'combinedQuaternion' to be safe with how the pontoon is rendered.
        // We need to know the LOCAL coordinate of this corner in the UNROTATED pontoon space.
        // Then apply quaternion.

        // We need to find which "original" corner corresponds to this "effective" corner (x,z).
        // Actually, getLugLayerAt does the inverse.
        // Here we want to render the lug at (x,z) relative to the pontoon's current orientation.

        // So (x,z) are offsets from the pontoon's min corner in World Space (since effectiveSize is rotated).
        // So relative to the center:
        const dx = (x - effectiveSizeX / 2) * cellSizeM;
        const dz = (z - effectiveSizeZ / 2) * cellSizeM;

        // Since x,z are aligned with the grid (and thus the world, mostly),
        // and the pontoon is rotated, 'dx' and 'dz' are actually World Axis offsets relative to the center.
        // So we don't need to apply the pontoon's rotation quaternion to them.

        const worldPos = new THREE.Vector3(
          center.x + dx,
          center.y + lugPlaneOffsetM,
          center.z + dz
        );

        const markerMaterialKey = `lug-marker-${layer}`;
        // Create material on the fly if needed or assume it exists?
        // Better to ensure it exists.

        // For now, let's just use a color directly or ensure materials are created.
        // We'll assume getMaterial handles it or we add it to createMaterials.

        // Actually, let's just create a mesh with a new material for simplicity in this debug method,
        // or use a cached one if we can.
        // But we need to update createMaterials to include these 4 colors.
        // For now, let's hack it by setting the color on the mesh if possible, or just use the sprite.

        // Let's use the sprite primarily.
        // Calculate inverse rotation to get the original local (x,z) key
        // config is already defined above
        const width = config.gridSize.x;
        const height = config.gridSize.z;

        let originalX = x;
        let originalZ = z;

        switch (pontoon.rotation) {
          case Rotation.EAST:
            originalX = z;
            originalZ = width - x;
            break;
          case Rotation.SOUTH:
            originalX = width - x;
            originalZ = height - z;
            break;
          case Rotation.WEST:
            originalX = height - z;
            originalZ = x;
            break;
          case Rotation.NORTH:
          default:
            break;
        }

        // Map local coordinates to German Cardinal Directions
        // Internal North is at X=2 (Red Ball position)
        // Z=0 is West (Left), Z=1 is East (Right)

        // Double Pontoon (2x1 cells)
        // 2,0 (NW) | 2,1 (NO)
        // 1,0 (W)  | 1,1 (O)
        // 0,0 (SW) | 0,1 (SO)

        let labelText = `${originalX},${originalZ}`; // Fallback

        if (pontoon.type === PontoonType.DOUBLE) {
          if (originalZ === 0) {
            // West Side (Left)
            if (originalX === 0) labelText = "SW";
            else if (originalX === 1) labelText = "W";
            else if (originalX === 2) labelText = "NW";
          } else if (originalZ === 1) {
            // East Side (Right)
            if (originalX === 0) labelText = "SO";
            else if (originalX === 1) labelText = "O";
            else if (originalX === 2) labelText = "NO";
          }
        } else if (pontoon.type === PontoonType.SINGLE) {
          // Single Pontoon (1x1 cells)
          // X+ is North, Z+ is East
          // Grid: (0,0)=SW | (1,0)=NW
          //       (0,1)=SE | (1,1)=NE
          if (originalZ === 0) {
            // West Side (Z=0)
            if (originalX === 0) labelText = "SW";
            else if (originalX === 1) labelText = "NW";
          } else if (originalZ === 1) {
            // East Side (Z=1)
            if (originalX === 0) labelText = "SE";
            else if (originalX === 1) labelText = "NE";
          }
        }

        const isNW = labelText === "NW";

        // Add label with Direction ONLY (e.g. "NW")
        /*
    const labelSprite = this.createLugLabelSprite(labelText, layer, isNW ? '#ff00ff' : undefined);
    if (labelSprite) {
      labelSprite.position.copy(worldPos);
      // Move ball significantly higher as requested
      labelSprite.position.y += LUG_MARKER_RADIUS_M * 2.5; 
      // Reduce scale slightly as requested ("Schrift zu groß")
      labelSprite.scale.set(0.2, 0.2, 0.2);
      this.lugDebugGroup.add(labelSprite);
    }
    */

        // Add Horizontal Line at actual lug height
        // Heights extracted directly from OBJ model analysis
        // See: scripts/analyze-pontoon-lugs.ts (Double) and scripts/analyze-single-pontoon.ts (Single)

        // Double Pontoon layer heights (Layer 1-4):
        // Layer 1: 216.5mm (NO, O)
        // Layer 2: 234mm (SO)
        // Layer 3: 250mm (SW)
        // Layer 4: 266mm (NW, W)
        const doublePontoonHeights = [216.5, 234, 250, 266];

        // Single Pontoon layer heights (Layer 1-4):
        // From pre-aligned model (no runtime rotation needed)
        // Layer 1: 232mm (NE)
        // Layer 2: 248mm (SE)
        // Layer 3: 264mm (SW)
        // Layer 4: 280mm (NW)
        const singlePontoonHeights = [232, 248, 264, 280];

        const layerHeights =
          pontoon.type === PontoonType.DOUBLE
            ? doublePontoonHeights
            : singlePontoonHeights;

        const layerHeightMM = layerHeights[layer - 1];
        const layerHeightM = layerHeightMM / 1000;

        if (isNW) {
          console.log(
            `DEBUG: NW Marker Layer: ${layer}, Height: ${layerHeightMM}mm`
          );
        }
        const debugColor = isNW ? "#ff00ff" : LUG_LAYER_COLORS[layer];

        // Draw a small horizontal plane/line
        const lineGeo = new THREE.PlaneGeometry(0.2, 0.02); // 20cm wide line
        const lineMat = new THREE.MeshBasicMaterial({
          color: debugColor,
          side: THREE.DoubleSide,
        });
        const lineMesh = new THREE.Mesh(lineGeo, lineMat);

        // Position at the corner, at the specific layer height
        // We need to rotate it to face outward or be visible.
        // For simplicity, let's make it look at the camera or just flat?
        // User said "horizontal Striche". Let's make it flat (XZ plane) or Billboard?
        // Let's try a Billboard-style sprite or just a flat mesh facing up?
        // "Horizontal Striche" usually means a dash seen from the side.
        // Let's make it a small box to be visible from all sides.
        const dashGeo = new THREE.BoxGeometry(0.15, 0.02, 0.02); // 15cm long dash
        const dashMesh = new THREE.Mesh(dashGeo, lineMat);

        // Position: Center of the corner + height
        dashMesh.position.set(
          worldPos.x,
          // Base of pontoon is at worldPos.y - lugPlaneOffsetM (which was top)
          // Wait, worldPos.y was "lugPlaneOffsetM" relative to center?
          // Let's look at how worldPos was calc: center.y + lugPlaneOffsetM.
          // center.y is the pontoon center.
          // Pontoon height is 400mm. Center is at 200mm.
          // We want height relative to bottom.
          // Bottom is center.y - 0.2.
          center.y - 0.2 + layerHeightM,
          worldPos.z
        );
        this.lugDebugGroup.add(dashMesh);

        // Add Layer Number near the line
        /*
    const numberSprite = this.createLugLabelSprite(layer.toString(), layer);
    if (numberSprite) {
      numberSprite.position.copy(dashMesh.position);
      numberSprite.position.y += 0.05; // Slightly above the line
      numberSprite.scale.set(0.15, 0.15, 0.15); // Smaller than the main ball
      this.lugDebugGroup.add(numberSprite);
    }
    */

        // Optional: Add a small sphere marker at the original "top" position just to mark the corner?
        // Maybe not needed if we have the high ball.
        // Let's keep the original marker code but maybe make it smaller or hidden?
        // The user said "in die großen Bälle... schreiben wir nur die Himmelsrichtung".
        // So the "marker" variable below was the ball.
        // I'll comment out the extra sphere to avoid clutter.
        /*
    const geometry = this.getGeometry('lug-marker');
    const material = new THREE.MeshBasicMaterial({ color: LUG_LAYER_COLORS[layer] });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(worldPos);
    this.lugDebugGroup.add(marker);
    */
      }
    }
  }

  private createLugLabelSprite(
    label: string,
    layer: number,
    colorOverride?: string
  ): THREE.Sprite | null {
    if (typeof document === "undefined") {
      return null;
    }

    const cacheKey = `lug-${label}-${layer}`;
    let texture = this.lugLabelTextureCache.get(cacheKey);
    if (!texture) {
      const canvas = document.createElement("canvas");
      const size = 128; // Reduced resolution slightly
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return null;
      }

      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = colorOverride || LUG_LAYER_COLORS[layer] || "#ffffff";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = LUG_LABEL_TEXT_COLOR;
      ctx.font = "bold 80px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Adjust text Y slightly to center visually
      ctx.fillText(label, size / 2, size / 2 + 5);

      texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      this.lugLabelTextureCache.set(cacheKey, texture);
    }

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.center.set(0.5, 0.5);
    const scale = 0.15;
    sprite.scale.set(scale, scale, scale);
    return sprite;
  }

  private renderOrientationMarker(pontoon: Pontoon, grid: Grid): void {
    const worldPos = grid.gridToWorld(pontoon.position);
    const positioned = this.applyFootprintOffsetByType(
      pontoon.type,
      pontoon.rotation,
      new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z)
    );

    // Use the same height as lug markers for visibility
    const lugPlaneOffsetM = EDGE_LUG_PLANE_OFFSET_MM / 1000;

    // Calculate North position (0.6m "Right" from center to match physical arrow)
    // User feedback: "The North of the pontoon is on the right side now... So 90 degrees to the right."
    // We use local X+ axis for this "Physical North"
    const northOffset = new THREE.Vector3(0.6, 0, 0);
    northOffset.applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      THREE.MathUtils.degToRad(pontoon.rotation)
    );

    const markerPos = new THREE.Vector3(
      positioned.x + northOffset.x,
      positioned.y + lugPlaneOffsetM,
      positioned.z + northOffset.z
    );

    // Create a red ball marker (reusing lug marker geometry)
    const geometry = this.getGeometry("lug-marker");
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(markerPos);

    // Scale it up slightly to distinguish from lugs
    marker.scale.set(1.2, 1.2, 1.2);

    this.lugDebugGroup.add(marker);

    // Add "N" label on top
    const labelSprite = this.createLugLabelSprite("N", 4); // Use color 4 (Coral) for visibility
    if (labelSprite) {
      labelSprite.position.copy(markerPos);
      labelSprite.position.y += LUG_MARKER_RADIUS_M * 1.5; // Sit on top of the ball
      labelSprite.scale.set(0.25, 0.25, 0.25);
      this.lugDebugGroup.add(labelSprite);
    }
  }

  private async renderShowcaseAssets(grid: Grid): Promise<void> {
    if (!this.showcaseVisible) {
      this.showcaseNeedsRefresh = false;
      return;
    }

    if (!SHOWCASE_ASSETS.length) {
      this.clearGroup(this.showcaseGroup);
      this.showcaseNeedsRefresh = false;
      return;
    }

    const assetEntries = await Promise.all(
      SHOWCASE_ASSETS.map(async (asset) => {
        try {
          const data = await this.ensureShowcaseAsset(asset);
          return { asset, ...data };
        } catch (error) {
          console.warn(
            "RenderingEngine: Failed to load showcase asset",
            asset.id,
            error
          );
          return null;
        }
      })
    );

    const validEntries = assetEntries.filter(
      (
        entry
      ): entry is {
        asset: ShowcaseAssetDefinition;
        info: ModelInfo;
        scale: number;
        dimensions: THREE.Vector3;
      } => entry !== null
    );

    this.clearGroup(this.showcaseGroup);

    if (!validEntries.length) {
      this.showcaseNeedsRefresh = false;
      return;
    }

    const baseSpacingM = 1.2;
    const totalWidth = validEntries.reduce((acc, entry, index) => {
      const spacing = index === 0 ? 0 : baseSpacingM;
      return acc + entry.dimensions.x + spacing;
    }, 0);
    const startX = -totalWidth / 2;

    const cellSizeM =
      CoordinateCalculator.CONSTANTS.CELL_SIZE_MM /
      CoordinateCalculator.CONSTANTS.PRECISION_FACTOR;
    const halfGridDepthM = (grid.dimensions.height * cellSizeM) / 2;
    const marginM = Math.max(cellSizeM, 1);
    const baseZ = halfGridDepthM + marginM;
    const deckTopM =
      CoordinateCalculator.CONSTANTS.PONTOON_HEIGHT_MM /
      CoordinateCalculator.CONSTANTS.PRECISION_FACTOR /
      2;

    let cursorX = startX;

    for (let index = 0; index < validEntries.length; index++) {
      const entry = validEntries[index];
      const halfWidth = entry.dimensions.x / 2;
      const positionX = cursorX + halfWidth;

      const worldPosition = new THREE.Vector3(
        positionX,
        deckTopM +
          entry.dimensions.y / 2 +
          (entry.asset.verticalOffsetMM ?? 0) / 1000,
        baseZ
      );

      const showcaseMesh = modelLoader.cloneModel(entry.info);
      modelLoader.prepareModelForGrid(
        showcaseMesh,
        worldPosition,
        entry.info,
        entry.scale
      );

      if (entry.asset.rotationYDeg) {
        showcaseMesh.rotation.y += THREE.MathUtils.degToRad(
          entry.asset.rotationYDeg
        );
      }

      showcaseMesh.userData = {
        showcaseAssetId: entry.asset.id,
        label: entry.asset.label,
      };

      this.showcaseGroup.add(showcaseMesh);

      const labelSprite = this.createShowcaseLabel(
        entry.asset.label,
        entry.asset.details ?? []
      );
      if (labelSprite) {
        const halfHeight = Math.max(entry.dimensions.y / 2, 0.08);
        labelSprite.position.set(
          worldPosition.x,
          worldPosition.y + halfHeight + 0.25,
          worldPosition.z
        );
        this.showcaseGroup.add(labelSprite);
      }

      cursorX = positionX + halfWidth + baseSpacingM;
    }

    this.showcaseNeedsRefresh = false;
  }

  private async ensureShowcaseAsset(
    asset: ShowcaseAssetDefinition
  ): Promise<{ info: ModelInfo; scale: number; dimensions: THREE.Vector3 }> {
    const cached = this.showcaseAssetCache.get(asset.id);
    if (cached) {
      return cached;
    }

    const info = await modelLoader.loadAsset(asset);
    const scale = this.computeShowcaseScale(asset, info);
    const dimensions = info.dimensions.clone().multiplyScalar(scale);

    const result = { info, scale, dimensions };
    this.showcaseAssetCache.set(asset.id, result);
    return result;
  }

  private computeShowcaseScale(
    asset: ShowcaseAssetDefinition,
    modelInfo: ModelInfo
  ): number {
    if (typeof asset.fixedScale === "number" && isFinite(asset.fixedScale)) {
      return asset.fixedScale;
    }

    const targetDimensionsMM: Array<{ target?: number; raw: number }> = [
      { target: asset.targetHeightMM, raw: modelInfo.dimensions.y },
      { target: asset.targetWidthMM, raw: modelInfo.dimensions.x },
      { target: asset.targetDepthMM, raw: modelInfo.dimensions.z },
    ];

    for (const { target, raw } of targetDimensionsMM) {
      if (typeof target === "number" && target > 0 && raw > 0) {
        return target / 1000 / raw;
      }
    }

    const maxDimension = Math.max(
      modelInfo.dimensions.x,
      modelInfo.dimensions.y,
      modelInfo.dimensions.z
    );
    if (maxDimension > 10) {
      return 1 / 1000;
    }

    return 1;
  }

  private createShowcaseLabel(
    title: string,
    details: string[] = []
  ): THREE.Sprite | null {
    if (typeof document === "undefined") {
      return null;
    }

    const cacheKey = [title, ...details].join("\n");
    const existing = this.labelCanvasCache.get(cacheKey);
    let texture: THREE.CanvasTexture;
    let width: number;
    let height: number;

    if (existing) {
      ({ texture, width, height } = existing);
    } else {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        return null;
      }

      const paddingX = 32;
      const paddingY = 28;
      const titleFontSize = 46;
      const bodyFontSize = 32;
      const titleFont = `600 ${titleFontSize}px "Inter", "Segoe UI", sans-serif`;
      const bodyFont = `400 ${bodyFontSize}px "Inter", "Segoe UI", sans-serif`;

      let maxLineWidth = 0;
      context.font = titleFont;
      maxLineWidth = Math.max(maxLineWidth, context.measureText(title).width);
      context.font = bodyFont;
      for (const line of details) {
        maxLineWidth = Math.max(maxLineWidth, context.measureText(line).width);
      }

      const titleLineHeight = titleFontSize + 6;
      const bodyLineHeight = bodyFontSize + 6;
      const gap = details.length ? 12 : 0;

      width = Math.ceil(maxLineWidth + paddingX * 2);
      height = Math.ceil(
        paddingY * 2 +
          titleLineHeight +
          (details.length ? gap + bodyLineHeight * details.length : 0)
      );

      canvas.width = width;
      canvas.height = height;

      const backgroundRadius = 18;
      context.font = titleFont;
      context.fillStyle = "rgba(22, 23, 26, 0.9)";
      context.beginPath();
      context.moveTo(backgroundRadius, 0);
      context.lineTo(width - backgroundRadius, 0);
      context.quadraticCurveTo(width, 0, width, backgroundRadius);
      context.lineTo(width, height - backgroundRadius);
      context.quadraticCurveTo(width, height, width - backgroundRadius, height);
      context.lineTo(backgroundRadius, height);
      context.quadraticCurveTo(0, height, 0, height - backgroundRadius);
      context.lineTo(0, backgroundRadius);
      context.quadraticCurveTo(0, 0, backgroundRadius, 0);
      context.closePath();
      context.fill();

      let currentY = paddingY;
      context.fillStyle = "#ffffff";
      context.textBaseline = "top";
      context.font = titleFont;
      context.fillText(title, paddingX, currentY);
      currentY += titleLineHeight;

      if (details.length) {
        currentY += gap;
        context.font = bodyFont;
        context.fillStyle = "#d1d5db";
        for (const line of details) {
          context.fillText(line, paddingX, currentY);
          currentY += bodyLineHeight;
        }
      }

      context.fillStyle = "#ffffff";

      texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = 4;
      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;

      this.labelCanvasCache.set(cacheKey, { texture, width, height });
    }

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.name = `showcase-label-${title}`;
    sprite.center.set(0.5, 0);
    sprite.renderOrder = 999;

    const metersPerPixel = 0.002;
    sprite.scale.set(width * metersPerPixel, height * metersPerPixel, 1);

    return sprite;
  }

  private renderAccessories(
    candidatePlacements: AccessoryPlacement[],
    placedPlacements: AccessoryPlacement[],
    highlightedId: string | null
  ): void {
    if (!candidatePlacements.length && !placedPlacements.length) {
      this.clearAccessories();
      return;
    }

    this.clearGroup(this.accessoryGroup);

    const ladderGeometry = this.getGeometry("ladder-placeholder");
    const ladderBracketGeometry = this.getGeometry("ladder-bracket");
    const ladderHighlightMaterial = this.getMaterial("accessory-ladder-active");
    const ladderPlacedMaterial = this.getMaterial("accessory-ladder-placed");
    const ladderAvailableMaterial = this.getMaterial(
      "accessory-ladder-available"
    );
    const ladderBracketHighlightMaterial = this.getMaterial(
      "accessory-ladder-bracket-highlight"
    );
    const ladderBracketPlacedMaterial = this.getMaterial(
      "accessory-ladder-bracket-placed"
    );
    const ladderBracketAvailableMaterial = this.getMaterial(
      "accessory-ladder-bracket-available"
    );

    const placedIds = new Set<string>();
    for (const placement of placedPlacements) {
      placedIds.add(placement.id);
      if (placement.type === "ladder-placeholder") {
        const group = new THREE.Group();
        group.position.copy(placement.position);
        group.rotation.y = placement.rotationY;

        const span = placement.span ?? 1;
        const baseMaterial =
          placement.id === highlightedId
            ? ladderHighlightMaterial
            : ladderPlacedMaterial;
        const base = new THREE.Mesh(ladderGeometry, baseMaterial);
        base.scale.set(span, 1, 1);
        group.add(base);

        const bracketOffsets: number[] = [];
        for (let i = 0; i < span; i++) {
          bracketOffsets.push((i - (span - 1) / 2) * CELL_SIZE_M);
        }

        const outward =
          placement.outward?.clone().normalize() ?? new THREE.Vector3(0, 0, 1);
        const forwardComponent =
          Math.abs(outward.x) > Math.abs(outward.z)
            ? Math.sign(outward.x)
            : Math.sign(outward.z);
        const forwardDistance = CELL_SIZE_M * 0.45 * forwardComponent;

        for (const offset of bracketOffsets) {
          const bracketMaterial =
            placement.id === highlightedId
              ? ladderBracketHighlightMaterial
              : ladderBracketPlacedMaterial;
          const bracket = new THREE.Mesh(
            ladderBracketGeometry,
            bracketMaterial
          );
          bracket.position.set(
            offset,
            -LADDER_BRACKET_HEIGHT_M / 2,
            forwardDistance
          );
          group.add(bracket);
        }

        group.userData = { accessoryType: placement.type, state: "placed" };
        this.accessoryGroup.add(group);
      }
    }

    for (const placement of candidatePlacements) {
      if (placedIds.has(placement.id)) {
        continue;
      }
      switch (placement.type) {
        case "ladder-placeholder": {
          const group = new THREE.Group();
          group.position.copy(placement.position);
          group.rotation.y = placement.rotationY;

          const span = placement.span ?? 1;
          const baseMaterial =
            placement.id === highlightedId
              ? ladderHighlightMaterial
              : ladderAvailableMaterial;
          const base = new THREE.Mesh(ladderGeometry, baseMaterial);
          base.scale.set(span, 1, 1);
          group.add(base);

          const bracketOffsets: number[] = [];
          for (let i = 0; i < span; i++) {
            bracketOffsets.push((i - (span - 1) / 2) * CELL_SIZE_M);
          }

          const outward =
            placement.outward?.clone().normalize() ??
            new THREE.Vector3(0, 0, 1);
          const forwardComponent =
            Math.abs(outward.x) > Math.abs(outward.z)
              ? Math.sign(outward.x)
              : Math.sign(outward.z);
          const forwardDistance = CELL_SIZE_M * 0.45 * forwardComponent;

          for (const offset of bracketOffsets) {
            const bracketMaterial =
              placement.id === highlightedId
                ? ladderBracketHighlightMaterial
                : ladderBracketAvailableMaterial;
            const bracket = new THREE.Mesh(
              ladderBracketGeometry,
              bracketMaterial
            );
            bracket.position.set(
              offset,
              -LADDER_BRACKET_HEIGHT_M / 2,
              forwardDistance
            );
            group.add(bracket);
          }

          group.userData = { accessoryType: placement.type };
          this.accessoryGroup.add(group);
          break;
        }
        default: {
          // Other accessory types will be rendered once design/spec is confirmed
          break;
        }
      }
    }
  }

  private clearAccessories(): void {
    this.clearGroup(this.accessoryGroup);
  }

  /**
   * Render single pontoon
   */
  private async renderPontoon(pontoon: Pontoon, grid: Grid): Promise<void> {
    const worldPos = grid.gridToWorld(pontoon.position);

    if (this.currentOptions.use3DModels) {
      // Use 3D model
      await this.render3DPontoon(
        pontoon,
        new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z)
      );
    } else {
      // Use simple box geometry
      this.renderBoxPontoon(
        pontoon,
        new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z)
      );
    }
  }

  /**
   * Render pontoon using simple box geometry
   */
  private renderBoxPontoon(pontoon: Pontoon, worldPos: THREE.Vector3): void {
    const geometry = this.getGeometry(pontoon.type);
    const material = this.getMaterial(`pontoon-${pontoon.color}`);

    const mesh = new THREE.Mesh(geometry, material);
    const positioned = this.applyFootprintOffsetByType(
      pontoon.type,
      pontoon.rotation,
      worldPos
    );
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
  private async render3DPontoon(
    pontoon: Pontoon,
    worldPos: THREE.Vector3
  ): Promise<void> {
    try {
      // Load 3D model (cached)
      const modelInfo = await this.load3DModel(pontoon.type);

      // Sanity: if a SINGLE is requested but the loaded model looks DOUBLE, fallback to box
      if (
        pontoon.type === PontoonType.SINGLE &&
        modelInfo.inferredType === "double"
      ) {
        console.warn(
          "3D model appears to be DOUBLE while SINGLE requested. Falling back to box.",
          modelInfo
        );
        this.renderBoxPontoon(pontoon, worldPos);
        return;
      }

      // Clone the model for this instance
      const pontoonMesh = modelLoader.cloneModel(modelInfo);

      // Calculate scale factor for proper size
      // For pontoons, use HEIGHT (400mm) as the reliable scaling reference.
      // Width/depth often include connector overhangs, but height is the
      // exact body dimension in the real world.
      const scaleFactor = modelLoader.calculateScaleFactorByHeight(
        modelInfo,
        400
      );

      // Apply positioning and scaling
      const positioned = this.applyFootprintOffsetByType(
        pontoon.type,
        pontoon.rotation,
        worldPos
      );
      modelLoader.prepareModelForGrid(
        pontoonMesh,
        positioned,
        modelInfo,
        scaleFactor
      );

      // Optional: compute and log overhang for debugging/validation.
      try {
        const targetWidthMM = pontoon.type === PontoonType.DOUBLE ? 1000 : 500;
        const targetDepthMM = 500;
        modelLoader.computeOverhang(modelInfo, {
          targetWidthMM,
          targetDepthMM,
          scaleFactor,
        });
      } catch (error) {
        console.debug(
          "RenderingEngine: pontoon overhang computation skipped",
          error
        );
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

      const baseQuaternion =
        modelInfo.baseQuaternion ?? pontoonMesh.quaternion.clone();
      const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        THREE.MathUtils.degToRad(pontoon.rotation)
      );
      pontoonMesh.setRotationFromQuaternion(
        baseQuaternion.clone().multiply(rotationQuaternion)
      );

      this.pontoonGroup.add(pontoonMesh);
    } catch (error) {
      console.warn(
        `Failed to load 3D model for pontoon ${pontoon.id}, falling back to box:`,
        error
      );
      // Fallback to box rendering
      this.renderBoxPontoon(pontoon, worldPos);
    }
  }

  /**
   * Calculate the correct world position for a pontoon, applying an offset so that
   * multi-cell pontoons (e.g., DOUBLE) are centered over their full footprint
   * starting from the anchor grid cell (top-left min corner in domain terms).
   */
  private getWorldPositionWithOffset(
    pontoon: Pontoon,
    baseWorldPos: THREE.Vector3
  ): THREE.Vector3 {
    return this.applyFootprintOffsetByType(
      pontoon.type,
      pontoon.rotation,
      baseWorldPos
    );
  }

  private getScaleFactorForHardware(
    cacheKey: string,
    modelInfo: ModelInfo,
    targetHeightMM: number
  ): number {
    if (this.connectorScaleCache.has(cacheKey)) {
      return this.connectorScaleCache.get(cacheKey)!;
    }

    const scale = modelLoader.calculateScaleFactorByHeight(
      modelInfo,
      targetHeightMM
    );
    this.connectorScaleCache.set(cacheKey, scale);
    return scale;
  }

  private async renderEdgeConnectors(
    placements: ConnectorPlacement[]
  ): Promise<void> {
    const [boltInfo, nutInfo, spacerDoubleInfo, spacerSingleInfo] =
      await Promise.all([
        modelLoader.loadEdgeConnectorBolt(),
        modelLoader.loadEdgeConnectorNut(),
        modelLoader.loadEdgeSpacer("double"),
        modelLoader.loadEdgeSpacer("single"),
      ]);

    const boltScale = this.getScaleFactorForHardware(
      "edge-bolt",
      boltInfo,
      EDGE_CONNECTOR_BOLT_HEIGHT_MM
    );
    const nutScale = this.getScaleFactorForHardware(
      "edge-nut",
      nutInfo,
      EDGE_CONNECTOR_NUT_HEIGHT_MM
    );
    const spacerDoubleScale = this.getScaleFactorForHardware(
      "edge-spacer-double",
      spacerDoubleInfo,
      EDGE_SPACER_DOUBLE_HEIGHT_MM
    );
    const spacerSingleScale = this.getScaleFactorForHardware(
      "edge-spacer-single",
      spacerSingleInfo,
      EDGE_SPACER_SINGLE_HEIGHT_MM
    );

    const pontoonHeightM =
      CoordinateCalculator.CONSTANTS.PONTOON_HEIGHT_MM /
      CoordinateCalculator.CONSTANTS.PRECISION_FACTOR;
    const deckOffsetM = EDGE_LUG_PLANE_OFFSET_MM / 1000;

    for (const placement of placements) {
      const base = placement.worldPosition;
      const levelCenterM = placement.level * pontoonHeightM;
      const deckPlaneM = levelCenterM + deckOffsetM;

      const useDoubleSpacer = placement.lugCount <= 2;
      const spacerInfo = useDoubleSpacer ? spacerDoubleInfo : spacerSingleInfo;
      const spacerScale = useDoubleSpacer
        ? spacerDoubleScale
        : spacerSingleScale;
      const spacerHeightM = spacerInfo.dimensions.y * spacerScale;

      // Render calculated spacers
      // Standard layer centers (mm from bottom) based on 16mm grid
      // L1: 224, L2: 240, L3: 256, L4: 272
      const LAYER_CENTERS_MM = [224, 240, 256, 272];

      if (placement.spacers) {
        for (const spacerReq of placement.spacers) {
          const isDouble = spacerReq.type === "double";
          const info = isDouble ? spacerDoubleInfo : spacerSingleInfo;
          const scale = isDouble ? spacerDoubleScale : spacerSingleScale;

          // Calculate center height for the spacer
          // Single: Center of the requested layer
          // Double: Center of the requested layer AND the next one
          let targetCenterFromBottomMM = LAYER_CENTERS_MM[spacerReq.layer - 1];
          if (isDouble) {
            // L1-L4 Gap Special Case
            // User Feedback: Remove Y-scaling (was too stretched) and position correctly
            // Y: +42mm (reverted from +34mm)
            // X: +8mm offset to center over lug hole
            const gapCenterY = base.y + 0.042;
            const xOffset = -0.008; // 8mm left (west) to counter previous eastward shift

            const spacerMesh = modelLoader.cloneModel(spacerDoubleInfo);
            modelLoader.prepareModelForGrid(
              spacerMesh,
              new THREE.Vector3(base.x + xOffset, gapCenterY, base.z),
              spacerDoubleInfo,
              spacerDoubleScale
            );

            // No additional Y-scaling applied (removed gapScaleFactor)

            this.applyEdgeMaterial(
              spacerMesh,
              this.getEdgeComponentMaterial("spacer-double")
            );
            this.connectorGroup.add(spacerMesh);

            continue;
          }

          // Convert "From Bottom" to "From Center" (Pontoon is 400mm high, Center is at 200mm)
          const targetCenterFromCenterMM = targetCenterFromBottomMM - 200;

          const spacerHeightFromCenterM = targetCenterFromCenterMM / 1000;
          const spacerWorldY = base.y + spacerHeightFromCenterM;

          // console.log(`DEBUG Spacer: Level ${placement.level}, BaseY ${base.y}, Layer ${spacerReq.layer}, FromBottom ${targetCenterFromBottomMM}, WorldY ${spacerWorldY}`);

          const spacerMesh = modelLoader.cloneModel(info);
          // Align model center to target world Y directly
          const spacerPositionY = spacerWorldY;

          modelLoader.prepareModelForGrid(
            spacerMesh,
            new THREE.Vector3(base.x, spacerPositionY, base.z),
            info,
            scale
          );

          // Visual Fix: Scale Y to fill the 17.5mm gap (Model is 16mm)
          // Only apply this if it's NOT the middle gap case (which we handled above)
          // And only for the bottom gap (Layer 1-2)
          if (spacerReq.layer === 1 || spacerReq.layer === 2) {
            const HEIGHT_CORRECTION = 1.09375;
            spacerMesh.scale.y *= HEIGHT_CORRECTION;
            spacerMesh.position.y =
              spacerPositionY - info.center.y * spacerMesh.scale.y;
          }

          const spacerMaterial = this.getEdgeComponentMaterial(
            isDouble ? "spacer-double" : "spacer-single"
          );
          this.applyEdgeMaterial(spacerMesh, spacerMaterial);

          spacerMesh.userData = {
            connectorKey: placement.key,
            level: placement.level,
            lugCount: placement.lugCount,
            variant: isDouble ? "edge-spacer-double" : "edge-spacer-single",
            layer: spacerReq.layer,
          };
          this.connectorGroup.add(spacerMesh);
        }
      }

      // Render Hardware (Bolt & Nut)
      const pinInfo = boltInfo; // Use boltInfo for pin
      const pinScale = boltScale;

      if (!pinInfo || !nutInfo) return;

      // Dynamic Positioning based on Occupied Layers (Reverted to User Preference)
      // The user preferred the previous Pin position.
      // We will use the occupied layers to determine the stack top/bottom.

      const layers = placement.occupiedLayers.sort((a, b) => a - b);
      if (layers.length === 0) return;

      const minLayer = layers[0];
      const maxLayer = layers[layers.length - 1];

      // Layer Centers (mm from bottom of pontoon, 16mm grid)
      // L1: 224, L2: 240, L3: 256, L4: 272
      // LAYER_CENTERS_MM is already defined above

      const stackBottomMM = LAYER_CENTERS_MM[minLayer - 1] - 8;
      const stackTopMM = LAYER_CENTERS_MM[maxLayer - 1] + 8;

      // Convert to Meters relative to Pontoon Center (200mm)
      const stackBottomY = base.y + stackBottomMM / 1000 - 0.2;
      const stackTopY = base.y + stackTopMM / 1000 - 0.2;

      // Pin (Randverbinder1) - Head at Top
      // Head Bearing Surface should be at stackTopY.
      // User liked the previous position, which was based on occupiedLayers.
      // User Feedback: Lower by 2mm to leave small gap to lug
      const PIN_OFFSET = 0.003; // +3mm (was +5mm)

      const pinMesh = modelLoader.cloneModel(pinInfo);

      modelLoader.prepareModelForGrid(
        pinMesh,
        new THREE.Vector3(base.x, stackTopY + PIN_OFFSET, base.z),
        pinInfo,
        pinScale
      );

      // Shift down so Top aligns with Target
      pinMesh.position.y -= (pinInfo.dimensions.y * pinScale) / 2;

      this.applyEdgeMaterial(pinMesh, this.getEdgeComponentMaterial("bolt"));
      pinMesh.userData = {
        connectorKey: placement.key,
        level: placement.level,
        lugCount: placement.lugCount,
        variant: "edge-pin",
      };
      this.connectorGroup.add(pinMesh);

      // Nut (Randverbinder2) - From Bottom
      // Nut Top (facing up) should be at stackBottomY.
      // User Feedback: "Mutter gibt es weiterhin keine." / "Inside the hole"
      // If it's inside, it's too high.
      // User Feedback: Nut needs to be raised by ~8mm (half lug height)
      // Previous offset -15mm, now -7mm
      const NUT_OFFSET = 0.007; // -7mm

      const nutMesh = modelLoader.cloneModel(nutInfo);

      modelLoader.prepareModelForGrid(
        nutMesh,
        new THREE.Vector3(base.x, stackBottomY - NUT_OFFSET, base.z),
        nutInfo,
        nutScale
      );

      // Shift down so Top aligns with Target
      nutMesh.position.y -= (nutInfo.dimensions.y * nutScale) / 2;

      this.applyEdgeMaterial(nutMesh, this.getEdgeComponentMaterial("nut"));
      nutMesh.userData = {
        connectorKey: placement.key,
        level: placement.level,
        lugCount: placement.lugCount,
        variant: "edge-nut",
      };
      this.connectorGroup.add(nutMesh);
    }
  }

  private getConnectorCenterY(level: number, connectorHeightM: number): number {
    const pontoonHeightM =
      CoordinateCalculator.CONSTANTS.PONTOON_HEIGHT_MM /
      CoordinateCalculator.CONSTANTS.PRECISION_FACTOR;
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

  private async loadConnectorModel(
    variant: ConnectorVariant
  ): Promise<ModelInfo> {
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
    const pos = new THREE.Vector3(
      baseWorldPos.x,
      baseWorldPos.y,
      baseWorldPos.z
    );

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
    this.applyPontoonHeightOffset(pos, type);
    return pos;
  }

  private applyPontoonHeightOffset(
    position: THREE.Vector3,
    type: PontoonType
  ): void {
    if (type === PontoonType.SINGLE) {
      position.y += SINGLE_PONTOON_VERTICAL_OFFSET_M;
    }
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

    const dims =
      this.currentGrid?.dimensions ??
      ({ width: 50, height: 50, levels: 3 } as any);
    const worldPos = this.calculator.gridToWorld(previewData.position, dims);

    const geometry = this.getGeometry(previewData.type);
    const materialKey = previewData.isValid
      ? "preview-valid"
      : "preview-invalid";
    const material = this.getMaterial(materialKey);

    const mesh = new THREE.Mesh(geometry, material);
    const rotation = previewData.rotation ?? Rotation.NORTH;
    // Apply the same footprint offset as real placement so preview aligns perfectly
    const positioned = this.applyFootprintOffsetByType(
      previewData.type,
      rotation,
      new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z)
    );
    mesh.position.set(
      positioned.x,
      positioned.y + PREVIEW_SURFACE_EPSILON_M,
      positioned.z
    );
    mesh.scale.set(
      PREVIEW_SCALE_FACTOR,
      PREVIEW_SCALE_FACTOR,
      PREVIEW_SCALE_FACTOR
    );
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
      const positioned = this.applyFootprintOffsetByType(
        pontoon.type,
        pontoon.rotation,
        new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z)
      );
      const geometry = this.getGeometry("selection-outline");
      const material = this.getMaterial("selection");

      const outline = new THREE.Mesh(geometry, material);
      outline.position.set(positioned.x, positioned.y, positioned.z);

      const typeConfig = getPontoonTypeConfig(pontoon.type);
      const cellSizeM = CoordinateCalculator.CONSTANTS.CELL_SIZE_MM / 1000;
      let sizeX = typeConfig.gridSize.x;
      let sizeZ = typeConfig.gridSize.z;
      if (
        pontoon.rotation === Rotation.EAST ||
        pontoon.rotation === Rotation.WEST
      ) {
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
      const geometry = this.getGeometry("support-indicator");
      const material = this.getMaterial(
        isValid ? "support-valid" : "support-invalid"
      );

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
    const textMaterial = this.getMaterial("text");

    // Add level text indicator (simplified)
    const levelIndicator = new THREE.Mesh(
      this.getGeometry("level-indicator"),
      textMaterial
    );
    levelIndicator.position.set(-12, levelY + 0.1, -12);

    this.gridGroup.add(levelIndicator);
  }

  /**
   * Update rendering options
   */
  updateOptions(options: Partial<RenderingOptions>): void {
    if (this.disposed) {
      console.warn("🎨 RenderingEngine: updateOptions() ignored after dispose");
      return;
    }
    this.currentOptions = { ...this.currentOptions, ...options };

    // Update material properties
    this.updateMaterialProperties();

    console.log("🎨 RenderingEngine: Options updated", options);
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
            if (
              mat &&
              mat instanceof THREE.Material &&
              !this.isCachedMaterial(mat)
            ) {
              mat.dispose();
            }
          }
        } else if (
          material instanceof THREE.Material &&
          !this.isCachedMaterial(material)
        ) {
          material.dispose();
        }
      } else if (child instanceof THREE.Sprite) {
        const material = child.material;
        if (
          material instanceof THREE.Material &&
          !this.isCachedMaterial(material)
        ) {
          if ("map" in material && material.map instanceof THREE.Texture) {
            // Keep cached label textures alive for reuse
            const keepTexture = Array.from(this.labelCanvasCache.values()).some(
              (entry) => entry.texture === material.map
            );
            if (!keepTexture) {
              material.map.dispose();
            }
          }
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
    this.pontoonGroup.name = "pontoons";
    this.scene.add(this.pontoonGroup);

    this.connectorGroup = new THREE.Group();
    this.connectorGroup.name = "connectors";
    this.scene.add(this.connectorGroup);

    this.drainGroup = new THREE.Group();
    this.drainGroup.name = "drain-plugs";
    this.scene.add(this.drainGroup);

    this.accessoryGroup = new THREE.Group();
    this.accessoryGroup.name = "accessories";
    this.scene.add(this.accessoryGroup);

    this.lugDebugGroup = new THREE.Group();
    this.lugDebugGroup.name = "lug-debug";
    this.scene.add(this.lugDebugGroup);

    this.showcaseGroup = new THREE.Group();
    this.showcaseGroup.name = "showcase";
    this.scene.add(this.showcaseGroup);

    this.gridGroup = new THREE.Group();
    this.gridGroup.name = "grid";
    this.scene.add(this.gridGroup);

    this.previewGroup = new THREE.Group();
    this.previewGroup.name = "preview";
    this.scene.add(this.previewGroup);

    this.hoverCellGroup = new THREE.Group();
    this.hoverCellGroup.name = "hover-cell";
    this.scene.add(this.hoverCellGroup);

    this.placementDebugGroup = new THREE.Group();
    this.placementDebugGroup.name = "placement-debug";
    this.scene.add(this.placementDebugGroup);

    this.selectionGroup = new THREE.Group();
    this.selectionGroup.name = "selection";
    this.scene.add(this.selectionGroup);

    this.supportGroup = new THREE.Group();
    this.supportGroup.name = "support";
    this.scene.add(this.supportGroup);
  }

  /**
   * Create and cache materials
   */
  private createMaterials(): void {
    // Grid material
    this.materialCache.set(
      "grid",
      new THREE.LineBasicMaterial({
        color: 0x888888,
        opacity: this.currentOptions.gridOpacity,
        transparent: true,
      })
    );

    // Pontoon materials for each color
    const pontoonColors = {
      blue: "#6183c2",
      black: "#111111",
      grey: "#e3e4e5",
      yellow: "#f7e295",
    };

    for (const [colorName, hex] of Object.entries(pontoonColors)) {
      this.materialCache.set(
        `pontoon-${colorName}`,
        new THREE.MeshLambertMaterial({
          color: hex,
        })
      );
    }

    // Preview materials
    this.materialCache.set(
      "preview-valid",
      new THREE.MeshLambertMaterial({
        color: 0x00ff00,
        opacity: this.currentOptions.previewOpacity,
        transparent: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );

    this.materialCache.set(
      "preview-invalid",
      new THREE.MeshLambertMaterial({
        color: 0xff0000,
        opacity: this.currentOptions.previewOpacity,
        transparent: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );

    // Selection material
    this.materialCache.set(
      "selection",
      new THREE.MeshBasicMaterial({
        color: this.currentOptions.selectionColor,
        wireframe: true,
      })
    );

    // Support materials
    this.materialCache.set(
      "support-valid",
      new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        opacity: 0.5,
        transparent: true,
      })
    );

    this.materialCache.set(
      "support-invalid",
      new THREE.MeshBasicMaterial({
        color: 0xff0000,
        opacity: 0.5,
        transparent: true,
      })
    );

    this.materialCache.set(
      "accessory-ladder-available",
      new THREE.MeshStandardMaterial({
        color: "#7dd3fc",
        opacity: 0.55,
        transparent: true,
        metalness: 0.08,
        roughness: 0.5,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    this.materialCache.set(
      "accessory-ladder-active",
      new THREE.MeshStandardMaterial({
        color: "#facc65",
        opacity: 0.85,
        transparent: true,
        metalness: 0.1,
        roughness: 0.32,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    this.materialCache.set(
      "accessory-ladder-placed",
      new THREE.MeshStandardMaterial({
        color: "#3b82f6",
        opacity: 0.85,
        transparent: true,
        metalness: 0.15,
        roughness: 0.3,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    this.materialCache.set(
      "accessory-ladder-bracket-available",
      new THREE.MeshStandardMaterial({
        color: "#7dd3fc",
        metalness: 0.2,
        roughness: 0.55,
      })
    );
    this.materialCache.set(
      "accessory-ladder-bracket-highlight",
      new THREE.MeshStandardMaterial({
        color: "#ffd166",
        metalness: 0.2,
        roughness: 0.5,
      })
    );
    this.materialCache.set(
      "accessory-ladder-bracket-placed",
      new THREE.MeshStandardMaterial({
        color: "#1e3a8a",
        metalness: 0.4,
        roughness: 0.35,
      })
    );

    // Text material
    this.materialCache.set(
      "text",
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
      })
    );

    // Hovered cell debug materials
    const hoverMaterialProps = { depthTest: false, depthWrite: false } as const;
    this.materialCache.set(
      "cell-outline",
      new THREE.MeshBasicMaterial({
        color: 0x00ff66,
        wireframe: true,
        ...hoverMaterialProps,
      })
    );
    this.materialCache.set(
      "cell-fill",
      new THREE.MeshBasicMaterial({
        color: 0x00ff66,
        transparent: true,
        opacity: 0.18,
        ...hoverMaterialProps,
      })
    );

    // Placement debug materials (used to visualize latest drop location)
    this.materialCache.set(
      "placement-outline",
      new THREE.MeshBasicMaterial({ color: 0xff3366, wireframe: true })
    );
    this.materialCache.set(
      "placement-fill",
      new THREE.MeshBasicMaterial({
        color: 0xff3366,
        transparent: true,
        opacity: 0.18,
      })
    );

    // Hardware shared materials
    this.materialCache.set(
      "hardware-connector",
      new THREE.MeshStandardMaterial({
        color: STANDARD_CONNECTOR_COLOR_HEX,
        metalness: 0.1,
        roughness: 0.55,
      })
    );
    this.materialCache.set(
      "hardware-edge",
      new THREE.MeshStandardMaterial({
        color: "#d0d0d0",
        metalness: 0.5,
        roughness: 0.45,
      })
    );
    this.materialCache.set(
      "hardware-drain",
      new THREE.MeshStandardMaterial({
        color: "#2a2a2a",
        metalness: 0.2,
        roughness: 0.8,
      })
    );

    if (DEBUG_ENABLE_DRAIN_MARKERS) {
      this.materialCache.set(
        "debug-drain-marker",
        new THREE.MeshBasicMaterial({
          color: 0xff3366,
        })
      );
    }

    if (DEBUG_ENABLE_LUG_MARKERS) {
      for (const [layer, color] of Object.entries(LUG_LAYER_COLORS)) {
        this.materialCache.set(
          `lug-marker-${layer}`,
          new THREE.MeshBasicMaterial({ color })
        );
      }
    }
  }

  private getSharedPontoonMaterial(
    color: PontoonColor
  ): THREE.MeshStandardMaterial {
    const key = `${this.pontoonMaterialCacheKeyPrefix}${color}`;
    let material = this.materialCache.get(key) as
      | THREE.MeshStandardMaterial
      | undefined;
    if (!material) {
      const colorHex = getPontoonColorConfig(color).hex;
      material = new THREE.MeshStandardMaterial({ color: colorHex });
      material.metalness = 0.0;
      material.roughness = 0.9;
      this.materialCache.set(key, material);
    }
    return material;
  }

  private getSharedHardwareMaterial(
    kind: "connector" | "edge" | "drain"
  ): THREE.MeshStandardMaterial {
    const key = `hardware-${kind}`;
    const material = this.materialCache.get(key) as
      | THREE.MeshStandardMaterial
      | undefined;
    if (material) return material;

    const fallbackColor =
      kind === "connector" ? STANDARD_CONNECTOR_COLOR_HEX : "#cccccc";
    const fallback = new THREE.MeshStandardMaterial({
      color: fallbackColor,
      metalness: kind === "connector" ? 0.1 : 0.4,
      roughness: kind === "connector" ? 0.55 : 0.5,
    });
    this.materialCache.set(key, fallback);
    return fallback;
  }

  private getEdgeComponentMaterial(
    kind: "bolt" | "nut" | "spacer-single" | "spacer-double"
  ): THREE.MeshStandardMaterial {
    const key = `edge-component-${kind}`;
    let material = this.materialCache.get(key) as
      | THREE.MeshStandardMaterial
      | undefined;
    if (material) {
      return material;
    }

    const palette: Record<typeof kind, string> = {
      bolt: "#1b1b1f",
      nut: "#4b4b50",
      "spacer-single": "#2b2b2f",
      "spacer-double": "#2b2b2f",
    } as const;

    material = new THREE.MeshStandardMaterial({
      color: palette[kind],
      metalness: kind === "bolt" || kind === "nut" ? 0.6 : 0.2,
      roughness: kind === "bolt" || kind === "nut" ? 0.35 : 0.55,
    });
    this.materialCache.set(key, material);
    return material;
  }

  private applyEdgeMaterial(
    group: THREE.Object3D,
    material: THREE.Material
  ): void {
    group.traverse((obj) => {
      if ((obj as any).isMesh) {
        (obj as THREE.Mesh).material = material;
      }
    });
  }

  /**
   * Create and cache geometries
   */
  private createGeometries(): void {
    // Single pontoon geometry
    this.geometryCache.set("single", new THREE.BoxGeometry(0.5, 0.4, 0.5));

    // Double pontoon geometry
    this.geometryCache.set("double", new THREE.BoxGeometry(1.0, 0.4, 0.5));

    // Selection outline (slightly larger box)
    this.geometryCache.set(
      "selection-outline",
      new THREE.BoxGeometry(0.55, 0.45, 0.55)
    );

    // Support indicator (small cylinder)
    this.geometryCache.set(
      "support-indicator",
      new THREE.CylinderGeometry(0.1, 0.1, 0.05)
    );

    // Level indicator (small box)
    this.geometryCache.set(
      "level-indicator",
      new THREE.BoxGeometry(0.2, 0.1, 0.2)
    );

    // Ladder placeholder indicator
    this.geometryCache.set(
      "ladder-placeholder",
      new THREE.BoxGeometry(0.5, 0.08, 0.18)
    );
    this.geometryCache.set(
      "ladder-bracket",
      new THREE.CylinderGeometry(
        LADDER_BRACKET_RADIUS_M,
        LADDER_BRACKET_RADIUS_M,
        LADDER_BRACKET_HEIGHT_M,
        12
      )
    );

    // Plane representing a single grid cell (XZ plane)
    this.geometryCache.set(
      "cell-plane",
      new THREE.PlaneGeometry(
        CoordinateCalculator.CONSTANTS.CELL_SIZE_MM / 1000,
        CoordinateCalculator.CONSTANTS.CELL_SIZE_MM / 1000
      )
    );

    if (DEBUG_ENABLE_DRAIN_MARKERS) {
      this.geometryCache.set(
        "drain-marker",
        new THREE.SphereGeometry(DRAIN_MARKER_RADIUS_M, 16, 12)
      );
    }

    if (DEBUG_ENABLE_LUG_MARKERS) {
      this.geometryCache.set(
        "lug-marker",
        new THREE.SphereGeometry(LUG_MARKER_RADIUS_M, 12, 10)
      );
    }
  }

  /**
   * Get cached material
   */
  private getMaterial(key: string): THREE.Material {
    const material = this.materialCache.get(key);
    if (!material) {
      console.warn("🎨 RenderingEngine: Material not found:", key);
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
    if (key === PontoonType.SINGLE) geometryKey = "single";
    if (key === PontoonType.DOUBLE) geometryKey = "double";

    const geometry = this.geometryCache.get(geometryKey);
    if (!geometry) {
      console.warn("🎨 RenderingEngine: Geometry not found:", geometryKey);
      return new THREE.BoxGeometry(0.5, 0.4, 0.5); // Default fallback
    }
    return geometry;
  }

  /**
   * Update material properties based on options
   */
  private updateMaterialProperties(): void {
    // Update grid opacity
    const gridMaterial = this.materialCache.get("grid");
    if (gridMaterial && "opacity" in gridMaterial) {
      gridMaterial.opacity = this.currentOptions.gridOpacity;
    }

    // Update preview opacity
    const previewValidMaterial = this.materialCache.get("preview-valid");
    if (previewValidMaterial && "opacity" in previewValidMaterial) {
      previewValidMaterial.opacity = this.currentOptions.previewOpacity;
    }

    const previewInvalidMaterial = this.materialCache.get("preview-invalid");
    if (previewInvalidMaterial && "opacity" in previewInvalidMaterial) {
      previewInvalidMaterial.opacity = this.currentOptions.previewOpacity;
    }

    // Update selection color
    const selectionMaterial = this.materialCache.get("selection");
    if (selectionMaterial && "color" in selectionMaterial) {
      (selectionMaterial as THREE.MeshBasicMaterial).color.setStyle(
        this.currentOptions.selectionColor
      );
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
      (this.renderStats.averageRenderTime *
        (this.renderStats.totalRenders - 1) +
        renderTime) /
      this.renderStats.totalRenders;
  }

  async setShowcaseVisibility(visible: boolean, grid?: Grid): Promise<void> {
    if (this.disposed) {
      console.warn(
        "🎨 RenderingEngine: setShowcaseVisibility() ignored after dispose"
      );
      return;
    }

    if (visible === this.showcaseVisible) {
      if (visible && grid) {
        this.showcaseNeedsRefresh = true;
        await this.renderShowcaseAssets(grid);
      }
      return;
    }

    this.showcaseVisible = visible;

    if (!visible) {
      this.showcaseNeedsRefresh = false;
      this.clearGroup(this.showcaseGroup);
      console.log("🎨 RenderingEngine: Showcase hidden");
      return;
    }

    this.showcaseNeedsRefresh = true;
    if (grid) {
      await this.renderShowcaseAssets(grid);
    }
    console.log("🎨 RenderingEngine: Showcase visible");
  }

  isShowcaseVisible(): boolean {
    return this.showcaseVisible;
  }

  /**
   * Toggle between 3D models and simple boxes
   */
  async toggle3DModels(use3D: boolean, grid?: Grid): Promise<void> {
    if (this.disposed) {
      console.warn(
        "🎨 RenderingEngine: toggle3DModels() ignored after dispose"
      );
      return;
    }
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

    console.log(
      `🎨 RenderingEngine: Switched to ${use3D ? "3D models" : "simple boxes"}`
    );
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
        modelCount: this.modelCache.size,
      },
    };
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    // Clear all groups
    this.disposePontoonInstances();
    this.clearGroup(this.pontoonGroup);
    this.clearGroup(this.connectorGroup);
    this.clearGroup(this.drainGroup);
    this.clearGroup(this.accessoryGroup);
    this.clearGroup(this.lugDebugGroup);
    this.clearGroup(this.showcaseGroup);
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
    for (const entry of this.labelCanvasCache.values()) {
      entry.texture.dispose();
    }
    this.labelCanvasCache.clear();
    for (const texture of this.lugLabelTextureCache.values()) {
      texture.dispose();
    }
    this.lugLabelTextureCache.clear();

    console.log("🧹 RenderingEngine: All resources disposed");
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}
