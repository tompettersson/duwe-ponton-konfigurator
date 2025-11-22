# Ponton-Konfigurator – Technische Grundspezifikation

> Version: 2025-01-31
> Autor: Act + Claude Code
> Status: Mathematische Präzisionsbasis

---

## 1 · IST-Stand (01/2025) - Technische Grundspezifikation

### 1.1 Frontend - Mathematische Präzision

- **Framework**: Next.js 15.1.2 (App Router, Turbopack, React 19 RC)
- **3D-Layer**: react-three-fiber @8 + drei.js
- **State**: Zustand mit mathematischer Präzision (GridMathematics + SpatialHashGrid)
- **Architektur**: Mathematisch exakte Implementierung
  - **Grid System**: 0.4m × 0.4m Zellen (400mm) - Single Pontoon Dimensionen
  - **Koordinaten**: Millimeter-basiert für 100% Präzision (PRECISION_FACTOR: 1000)
  - **Spatial Indexing**: O(1) Kollisionserkennung via Hash Grid
  - **Performance**: Instanced Rendering für große Plattformen
- **Kern Features**
  - 2D- & 3D-Ansicht mit mathematisch präzisen Kamerapositionen
  - Multi-Level Support mit struktureller Validierung  
  - Snap-to-Grid System mit exakter Positionierung
  - Undo/Redo via History-basierter State Management
- **Mathematische Garantien**
  - Keine Schätzwerte oder Approximationen
  - Präzise Bounding Box Berechnungen
  - Exakte Grid-Koordinaten für Fertigung

### 1.2 Backend / Datenhaltung

- **Datenbank**: Vercel Postgres (Neon) – Schema noch offen
- **API**: noch keine – keine Persistenz ausser lokalem State
- **Auth**: NextAuth vorgesehen, aber nicht implementiert

### 1.3 Build & Ops

- Deployment auf Vercel Preview/Prod
- Keine Tests, kein CI Workflow

---

## 2 · Zielsetzung - Mathematische Basis

### Primäres Ziel: Mathematische Exaktheit

1. **Mathematisch exakte Grid-Basis** mit 0.4m × 0.4m Präzision
2. **Spatial Hash Grid** für O(1) Performance bei großen Plattformen (100×100+ Zellen)
3. **100% Präzise Berechnungen** - keine Approximationen oder Schätzwerte
4. **Instanced Rendering** für 60 fps Performance bei 1000+ Pontoons
5. **Solid Foundation** für spätere Backend Integration und CAD Export

### MVP Phasen

**Phase 1: Mathematische Basis** (Aktuelle Priorität)
- GridMathematics + SpatialHashGrid Implementation
- Millimeter-präzise Koordinaten
- Snap-to-Grid mit mathematischer Exaktheit
- Einfache geometrische Repräsentation (keine komplexen 3D Modelle)

**Phase 2: Performance & UI** 
- Instanced Rendering für große Grids
- 2D/3D View Modi mit präziser Kamera-Kontrolle
- Undo/Redo System
- Erweiterte Interaktion (Multi-Select, Rotation)

**Phase 3: Backend Integration** (Später)
- Postgres Persistierung mit exakten Koordinaten
- PDF Export für Materiallisten
- User Authentication
- CAD Export Vorbereitung

---

## 3 · Architektur-Entwurf

```
Next.js App Router
│
├─ Mathematische Basis (lib/)
│   ├─ GridMathematics.ts (Koordinaten-Transformation)
│   ├─ SpatialHashGrid.ts (O(1) Kollisionserkennung)
│   └─ CollisionDetection.ts (Präzise Validierung)
│
├─ 3D Components (components/configurator/)
│   ├─ PontoonConfigurator.tsx (Haupt-Orchestrierung)
│   ├─ GridSystem.tsx (Visueller Grid mit exakten Linien)
│   ├─ InteractionManager.tsx (Präzise Raycasting)
│   └─ PontoonManager.tsx (Instanced Rendering)
│
├─ State Management (store/)
│   └─ configuratorStore.ts (Zustand + Spatial Index)
│
└─ Server Components / Server Actions (Später)
    ├─ saveProject() (Mit exakten Koordinaten)
    └─ loadProject() (Mathematische Validierung)
```

### Technische Kernpunkte

- **State > Store**
  - `configuratorStore` (Zustand + Immer + SpatialHashGrid) → Grid, Selection, History
  - Alle Koordinaten in Millimetern für Präzision
  - Spatial Index für O(1) Abfragen
- **Grid System**
  - 0.4m × 0.4m Zellen (400mm) exakt Single Pontoon Größe
  - Vollständige Raum-Durchdringung
  - Snap-to-Grid mit mathematischer Exaktheit
- **3D-Optimierung**
  - InstancedMesh für identische Pontoons
  - Minimale Geometrie (Boxes) für Basis-Implementation
  - Layer-basiertes Rendering (Grid, Pontoons, Hover, UI)

---

## 4 · Roadmap (High-Level)

| Phase                    | Zeitraum | Deliverables                                                     |
| ------------------------ | -------- | ---------------------------------------------------------------- |
| 1 Mathematische Basis    | W1-2     | GridMathematics, SpatialHashGrid, exakte Koordinaten            |
| 2 Core 3D Implementation | W3-4     | R3F Components, Instanced Rendering, Grid System                |
| 3 Interaktion & UI       | W5-6     | Raycasting, Tool System, Undo/Redo                             |
| 4 Performance & Polish   | W7-8     | Optimierung, Stress Testing, UI Polish                         |
| 5 Backend Integration    | Später   | Postgres, Server Actions, PDF Export                           |

---

## 5 · Implementierung (Detail - nächste 4 Wochen)

### Woche 1-2: Mathematische Basis

1. **Type Definitions** (types/index.ts)
   - [ ] GridPosition, PontoonElement, GridCell interfaces
   - [ ] Mathematische Konstanten (CELL_SIZE_MM: 400, PRECISION_FACTOR: 1000)

2. **Grid Mathematics** (lib/grid/GridMathematics.ts)
   - [ ] worldToGrid(), gridToWorld() mit millimeter Präzision
   - [ ] snapToGrid() für exakte Positionierung
   - [ ] getGridKey(), parseGridKey() für Spatial Hashing

3. **Spatial Hash Grid** (lib/grid/SpatialHashGrid.ts)
   - [ ] insert(), remove(), query() mit O(1) Performance
   - [ ] checkCollision() für Validierung
   - [ ] Bounds-checking für Multi-Cell Elements

### Woche 3-4: Core 3D Implementation

1. **Store Implementation** (store/configuratorStore.ts)
   - [ ] Zustand + Immer + SpatialHashGrid Integration
   - [ ] History System für Undo/Redo
   - [ ] addPontoon(), removePontoon() mit Spatial Index

2. **Grid System** (components/configurator/GridSystem.tsx)
   - [ ] Visueller Grid mit exakten 0.4m Linien
   - [ ] Hover Indicator mit präziser Positionierung
   - [ ] Layer-basiertes Rendering

3. **Pontoon Management** 
   - [ ] InstancedMesh für Performance
   - [ ] Einfache Box Geometrie (mathematisch exakt)
   - [ ] Selection System mit visueller Rückmeldung

### Woche 5-6: Interaktion & UI

1. **Interaction Manager** (components/configurator/InteractionManager.tsx)
   - [ ] Präzises Raycasting zu Grid-Koordinaten
   - [ ] Tool System (Select, Place, Delete, Rotate)
   - [ ] Keyboard Shortcuts (Undo/Redo, Delete, Escape)

2. **UI Components**
   - [ ] Toolbar mit Tool Selection
   - [ ] ViewModeToggle (2D/3D) mit präziser Kamera-Kontrolle
   - [ ] Status Display für Grid-Koordinaten

---

## 6 · Tests & Validation

### Mathematische Validierung
- **Unit Tests** für GridMathematics (Koordinaten-Transformation)
- **Performance Tests** für SpatialHashGrid (1000+ Elements)
- **Precision Tests** für Snap-to-Grid (Millimeter-Exaktheit)

### End-to-End Tests
- **Placement Accuracy** (Visual Regression Testing)
- **Performance Benchmarks** (60fps bei 100×100 Grid)
- **Memory Usage** (Instanced Rendering Effizienz)

---

## 7 · Offene Fragen / Risiken

1. **Performance**: Spatial Hash Grid vs. R-Tree für sehr große Grids (1000×1000)?
2. **Memory**: Instanced Rendering Limits bei extrem großen Plattformen?
3. **Precision**: Float64 vs. Integer-basierte Koordinaten für absolute Exaktheit?
4. **Mobile**: Touch-basierte Interaktion mit präziser Grid-Auswahl?

---

## 8 · Glossar

- **Pontoon** = Einzelner Schwimmkörper 0.4×0.4 m (400mm Grid)
- **Grid Cell** = 0.4m × 0.4m Zelle mit millimeter-präzisen Koordinaten
- **Spatial Hash** = O(1) räumliche Indexierung für Kollisionserkennung
- **Instancing** = GPU-optimiertes Rendering für identische Objekte
- **Snap-to-Grid** = Mathematisch exakte Positionierung auf Grid-Punkten
- **Precision Factor** = 1000 (Millimeter-Umrechnung für Ganzzahl-Arithmetik)

---

**Nächster Schritt**: Implementation der mathematischen Basis starten → GridMathematics.ts + SpatialHashGrid.ts