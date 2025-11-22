# Ponton‑Konfigurator – Projektplan

> Version: 2024‑06‑XX
> Autor: Act

---

## 1 · IST‑Stand (06/2024)

### 1.1 Frontend

- **Framework**: Next.js 15.1.2 (App Router, Turbopack, React 19 RC)
- **3D‑Layer**: react‑three‑fiber @8 + drei.js
- **State**: Zustand (Slice‑basierte Stores) → evtl. Migration zu XState für komplexe Workflows
- **Aktuelle Features**
  - 2D‑ & 3D‑Ansicht per Toggle (Orthographic ↔ Perspective)
  - Vier Ebenen (Level ‑2, ‑1, 0, 1)
  - Platzierung & Löschen von Single/Double‑Pontons (inkl. Drehung)
  - Wasser‑ & Himmel‑Shader vorhanden (aber noch Basic‑Optik)
- **Pain Points**
  - Grid‑Performance bei großen Flächen (r‑three‑fiber instancing fehlt)
  - Kein Undo/Redo
  - VRAM‑Last durch ungecachte Texturen

### 1.2 Backend / Datenhaltung

- **Datenbank**: Vercel Postgres (Neon) – Schema noch offen
- **API**: noch keine – keine Persistenz ausser lokalem State
- **Auth**: NextAuth vorgesehen, aber nicht implementiert

### 1.3 Build & Ops

- Deployment auf Vercel Preview/Prod
- Keine Tests, kein CI Workflow

---

## 2 · Zielsetzung (MVP)

1. **Stabiles Grid‑Editing** in 2D & 3D für Single/Double‑Pontons inkl. Rotation
2. **Performance**: 60 fps auf Desktop & 30 fps auf Tablet (bis Grid 100×100)
3. **Login & Projektspeicherung** in Postgres (Autosave + „Projekt speichern“‑Button)
4. **Materialliste** (PDF‑Export) mit allen verbauten Pontons & Accessories
5. **Rule‑Engine** für Accessory‑Platzierung (Basis: Kollisionsprüfung, Kanten‑Checks)

---

## 3 · Architektur‑Entwurf

```
Next.js App Router
│
├─ Client Components (r3f)
│   ├─ Canvas2D (Orthographic)
│   └─ Canvas3D (Perspective)
│
├─ Server Components / Server Actions
│   ├─ saveProject()
│   └─ loadProject()
│
├─ API Routes (tRPC)
│   └─ /projects  ↔  Postgres (Neon)
│
└─ Auth (NextAuth) → Vercel KV  Session
```

- **State > Store**
  - `editorStore` (Zustand + Immer) ➜ Grid, Selection, Level
  - `uiStore` (Zustand) ➜ Panels, Modals, Settings
  - Option: XState FSM für Mode‑Wechsel (Edit, Accessory, Preview)
- **Persistenz**
  - Server Actions (Next.js 15) talken direkt mit prisma @5 + Neon
  - Autosave via Debounce (5 s) während Editing (Edge Function)
- **3D‑Optimierung**
  - InstancedMesh für Pontons
  - Wasser‑Material: Drei‑std Water + Neben planeDepthWrite false
  - Grid‑Lines: ThinLineMaterial (troika‑three) oder Shader‑Instancing

---

## 4 · Roadmap (High‑Level)

| Phase               | Monat | Deliverables                                                     |
| ------------------- | ----- | ---------------------------------------------------------------- |
|  1 Foundation       | 06    |  Refactor r3f Scene, Instancing, Level‑Toggle, Code Cleanup      |
|  2 Backend + Auth   | 07    |  NextAuth, Postgres Schema, Server Actions save/load + Autosave  |
|  3 Accessory System | 08    |  Accessory‑Schema, Rule‑Engine v1, UI‑Palette                    |
|  4 Materialliste    | 09    |  PDF Generator (React‑PDF), Export‑Dialog                        |
|  5 Mobile & QA      | 10    |  Responsive HUD, P‑WA Audit, Playwright Tests                    |

---

## 5 · Aufgabenliste (Detail Next 4 Wochen)

1. **Grid‑Refactor**
   - [ ] `Grid.tsx` als Instanced‑Plane ersetzen
   - [ ] Durchgezogene Linien als Shader, Level‑Color / Opacity
2. **Pontons**
   - [ ] `Pontoon` InstancedMesh (single)
   - [ ] `PontoonDouble` = 2 Instanzen + Rotation Logik
   - [ ] Hit‑Detection via raycaster → Grid‑Koordinaten
3. **State**
   - [ ] Zustand Store splitten (editor/ui)
   - [ ] Undo/Redo History (immer‑based patches)
4. **UI**
   - [ ] Top‑Bar Level Selector (Tabs)
   - [ ] Right‑Slide‑Panel „Materialliste“ (HeadlessUI Dialog)
5. **Backend**
   - [ ] Prisma schema.prisma (User, Project, Block, Accessory)
   - [ ] Server Action `createProject`, `updateProject`

---

## 6 · Tests & CI/CD

- **Unit** (Vitest, Testing Library)
- **e2e** (Playwright @Vercel/CI) – 2D & 3D selectors via `data‑testid`
- **Lint/Format** (ESLint + Prettier + Types‑strict)
- **CI** (GitHub Actions → Vercel Preview)

---

## 7 · Offene Fragen / Risiken

1. **Rule‑Engine** Detailtiefe? (physikalische Prüfung vs. einfache Nachbarschafts‑Checks)
2. **PDF‑Generation** im Edge Runtime > evtl. heavy (Fallback: Serverless Function region‑US)
3. **Mobil‑Performance** bei 100×100 Grid + Accessories
4. **Lizenz** für Texturen / Icons

---

## 8 · Glossar

- **Pontoon** = Einzelner Schwimmkörper 1×1 m
- **Accessory** = Anbauteil (Ring, Cleat, Bollard …)
- **Level** = Vertikale Ebene (‑2 bis 2)
- **r3f** = react‑three‑fiber
- **Instancing** = GPU‑Draw‑Call batching für viele Objekte

---

**Nächster Schritt**: Phase 1 starten → Grid‑Refactor & Instancing.
