# Repository Guidelines

## Project Structure & Module Organization
- Source: `app/` (Next.js App Router). Key areas: `app/components/` (React), `app/lib/ui/` (rendering + interaction), `app/store/` (Zustand stores), `app/utils/`, `app/constants/`.
- Public assets: `public/`
- Tests: `tests/` (Playwright), config in `playwright.config.ts`
- Styling: `app/globals.css`, Tailwind config in `tailwind.config.mjs`

## Build, Test, and Development Commands
- `npm run dev` — Start dev server with Turbopack at `http://localhost:3000`
- `npm run build` — Production build
- `npm start` — Run production server
- `npm run lint` — ESLint (Next core-web-vitals)
- `npm test` — Run Playwright tests (headless)
- `npm run test:ui` — Playwright UI mode
- `npm run test:headed` — Run tests with visible browser
- Examples: `npm test -- tests/select-tool.spec.ts`

## Coding Style & Naming Conventions
- Language: TypeScript/JavaScript; React 19 + Next 15
- Indentation: 2 spaces; keep lines < 100 chars when reasonable
- Components: PascalCase files (e.g., `NewPontoonConfigurator.tsx`, `App.tsx`)
- Stores/Utils: camelCase files (e.g., `configuratorStore.ts`, `collisionDetection.ts`)
- Hooks: `useXyz.ts` in `app/hooks/`
- Exports: prefer named exports from index barrels (e.g., `app/lib/ui/index.ts`)
- Linting: fix issues or add minimal, justified disables per line

## Testing Guidelines
- Framework: Playwright (`@playwright/test`)
- Location: `tests/*.spec.ts`
- Conventions: `describe` suites and clear, imperative `test` names
- Add scenarios for critical tools (Select/Move/Multi-Drop/Paint); include screenshots only when useful
- Run: `npm test` (server auto-managed by Playwright). For focused runs: `npm test -- tests/drag-detection.spec.ts`

## Commit & Pull Request Guidelines
- Commits: short imperative summaries (e.g., “Fix Multi-Drop drag detection”); scope-specific; split refactors vs features
- PRs: include description, rationale, before/after notes, linked issues, and screenshots for UI changes
- Keep PRs small and focused; add test updates alongside code changes

## Security & Configuration Tips
- Env vars: use `.env.local` (not committed). Avoid secrets in code/tests
- Dependencies: prefer minor/patch bumps; run `npm run lint && npm test` before PR

## 3D-Asset-Analyse – Pontonverbinder (Sept 2024)

### Gruppe A – Zentrale, platzierbare Elemente
- `public/3D/fc/Ponton.obj`, `public/3D/Ponton_single.obj`, `public/3D/neu/Ponton*.{obj,fbx,stl,stp}` – Basismodul(e) 50×50×40 cm und Doppelmodule (~100×50×40 cm); Orientierung gemäß PDF (Ventil/Logo ausrichten, Lugs 1–4 im Uhrzeigersinn).
- `public/3D/fc/Verbinder.obj` – Standard-Kurzverbinder für jede Vier-Lug-Kreuzung; von oben einsetzen, 45° drehen (Schlüssel nötig), Kopf bündig.
- `public/3D/fc/Verbinderlang.obj` – Langer Verbinder für mehrlagige Aufbauten oder hohe Bauteile; durch zwei Ebenen führen und verriegeln.
- `public/3D/fc/Randverbinder1.obj` & `public/3D/fc/Randverbinder2.obj` – Rand-/Eckverbinder (Schraube & Mutter) zum Schließen von Kanten, besonders bei Zubehörmontage; erfordern manuelles Anziehen.
- `public/3D/fc/Einzel-Scheibe.obj` & `public/3D/fc/Scheibe.obj` – Distanzscheiben (1× bzw. 2× Lugstärke) zum Auffüllen fehlender Lugs an Kanten/Übergängen.
- `public/3D/fc/Flutschraube.obj` – Entlüftungs-/Drainstopfen; gehört an die Seitenöffnung jedes Pontons (Konsistenz bei Ausrichtung sicherstellen).

### Gruppe B – Sekundäre bzw. kontextabhängige Teile
- `public/3D/fc/Mutternschlüssel.obj` & `public/3D/fc/Schlüssel.obj` – Montagewerkzeuge (Mutternschlüssel, Verriegelungsschlüssel); für In-Szene-Visualisierung optional.
- `public/3D/badeleiter/*` – Komponenten der Badeleiter (Inventor-Baugruppen); Montage über Spezialverbinder an Außenkante, Platzierung erfordert definierte Andockpunkte.
- `public/3D/zubehoer/Bootsklampe*.ipt`, `public/3D/zubehoer/Bootsfender*.{iam,ipt}`, `public/3D/zubehoer/PU-*.ipt`, `public/3D/zubehoer/Randschiene *.ipt`, `public/3D/zubehoer/Baderutsche.ipt` – Zubehör (Klampe, Fender, PU-Fender/Eckschutz, Randschienen, Rutsche); bekannte Funktion, aber es fehlen noch exakte Slot/Loch-Definitionen im Raster.
- `public/3D/ponton-zubehoer/Verbinder Leiter.ipt` u. weitere `.ipt`/`.iam` – CAD-Quellen der Verbinder (identisch zu fc-Objekten), relevant für Umkonvertierungen oder detaillierte Varianten.
- `public/3D/single/500x500.{DWG,DXF,STP}` – Referenz für Einzelfloat (50×50 Grundmodul); nutzbar für CAD- oder Präzisionsabgleich, weniger für Runtime.

### Gruppe C – Noch zu klärende/ungenutzte Assets
- `public/3D/zubehoer/Insel.iam` – Insel-/Sonderbaugruppe, keine Platzierungsstrategie dokumentiert.
- `public/3D/neu/Ponton2.fbx` (Variante), `public/3D/neu/Ponton_doublle.obj` – Alternative Exportstände; Maße plausibel, aber Material/Normalenprüfung offen.
- `public/3D/ponton-zubehoer/Unterlegscheibe.ipt`, `public/3D/ponton-zubehoer/Randverbinder lang.*` – Zusätzliche CAD-Varianten ohne klaren Einsatzzweck in aktueller Pipeline (ggf. Spezialkanten).
- `public/3D/.DS_Store` – Systemartefakt, ignorieren.

### Hinweise & Nächste Schritte
- Für Gruppe-A-Elemente automatische Platzierungslogik ausrichten (Lug-Indexierung, Kantenklassifizierung, Washer-Auto-Insertion bei <4 Lugs).
- Gruppe B benötigt definierte Montagepunkte (z. B. Ladder-Brackets, Fender-Halter) bevor Automatik möglich ist.
- Für Gruppe C Entscheidung treffen: Konvertieren/prüfen, dokumentieren oder archivieren.
- **Commit-Frequenz:** Nach jeder relevanten Änderung (Feature-Step, Fix, Doc) committen, um Debugging/Cherry-Pick zu erleichtern.
- **Notizen 2025-03-27:** Pontons & Verbinder laufen jetzt über Instanced Rendering, riesige Layouts deutlich flüssiger. Offener Punkt: Verbinder (stand früher blau) nutzen aktuell `hardware-connector` Material und erscheinen grau → morgen prüfen, ob Farbzuordnung fehlen (ggf. `getSharedHardwareMaterial` farbabhängig machen oder UI-Option ergänzen). Nächste Optimierungen: (1) Drain Plugs & Rand-Hardware instanzieren, (2) Dirty-Update-Renderer vorbereiten (Instanzen nur delta-updaten), (3) Material/Farb-Steuerung für Hardware konsolidieren. Externe Modellvereinfachung (Blender/Draco) bleibt als separater Task.

### Lug-Indexierung & aktuelle Automatik
- Lug-Referenz: Bei Rotation `NORTH` zeigt Lug 1 nach „Nord-West“ (−X/−Z), anschließend im Uhrzeigersinn (2 = +X/−Z, 3 = +X/+Z, 4 = −X/+Z). Drehungen der Pontons rotieren das Schema mit.
- Automatische Hardware setzt sich wie folgt zusammen:
  - `lugCount = 4`: Kurzverbinder (`Verbinder.obj`).
  - `lugCount = 3`: Randverbinder + Einzel-Scheibe (einfacher Spacer).
  - `lugCount ≤ 2`: Randverbinder + Scheibe (doppelter Spacer) – deckt jetzt auch exponierte Einzel-Lugs ab.
- Jeder Ponton erhält automatisch eine Drain-/Entlüftungsschraube (`Flutschraube.obj`) auf der positiven Z-Seite seiner lokalen Achse; Drehung des Pontons orientiert die Schraube entsprechend.
- **Lug-Höhen (Datenquelle: `LUG_DEBUG_LAYOUT` in `RenderingEngine.ts`):**
  - *Einzel-Ponton (1×1, Rotation `NORTH`):*
    - Lug 1 → (-X,-Z) **high**
    - Lug 2 → (+X,-Z) **low**
    - Lug 3 → (+X,+Z) **low**
    - Lug 4 → (-X,+Z) **high**
  - *Doppel-Ponton (2×1, Rotation `NORTH`):*
    - Lug 1 → (-X,-Z) **high**
    - Lug 2 → ( 0,-Z) **low**
    - Lug 3 → (+X,-Z) **high**
    - Lug 4 → (-X,+Z) **high**
    - Lug 5 → ( 0,+Z) **low**
    - Lug 6 → (+X,+Z) **high**
  - Drehungen werden rein mathematisch angewandt: das Layout wird um 90°/180°/270° rotiert (EAST/WEST vertauscht X/Z, SOUTH invertiert beide Achsen). Damit lässt sich für jede Platzierung exakt bestimmen, welcher Lug auf welcher Höhe sitzt – unabhängig davon, ob es Single- oder Double-Pontoons sind.

## Internal Notes (2025-10-23)
- STEP→STL Konverter (`tools/convert_step.py`) nutzt `cadquery-ocp`. Workflow: `python3 -m pip install cadquery-ocp`, danach `python3 tools/convert_step.py` (Outputs: `public/3d/converted/*.stl`).
- ToDo nächste Session: neu erzeugte STL-Meshes entlang der Bühnenkante platzieren, um alle gelieferten Objekte zu sichten.
