# Pontoon Configurator (Next.js 15)

A domain-driven pontoon configurator focused on millimeter precision, built with Next.js 15, React 19, and Three.js. The application now runs exclusively on the new architecture that unifies rendering, validation, and interaction around a single `RenderingEngine`.

## Key Features

- **Single Source of Truth** for hover, preview, and placement feedback via the domain layer (`app/lib/domain`)
- **RenderingEngine** (Three.js) handles grid, pontoons, connectors, and hover overlays without legacy fallbacks
- **Play/Debug Panel** exposes machine-readable state for automated tests and rapid QA
- **OrbitControls Navigation** with quick 2D/3D toggling and multi-level support
- **Playwright Test Suite** validating click precision, multi-drop, rotation, paint, move, and selection tools

## Project Layout

```
app/
  components/
    NewPontoonConfigurator.tsx   # Unified React entry point
  lib/
    domain/                      # Immutable grid/pontoon services
    ui/                           # RenderingEngine + interaction services
  test-new-architecture/         # Dedicated route for automated testing
public/                          # Assets and 3D models
tests/                           # Playwright specs (new architecture only)
```

The legacy implementation (`app/components/configurator`, `app/store`, etc.) has been removed. A full snapshot of the previous tree is available as `project-backup-<timestamp>.tar.gz` in the repository root if you need to inspect or restore pieces of the old code.

## Getting Started

```bash
npm install
npm run dev
```

- Development server: http://localhost:3000
- Test route used by the suite: http://localhost:3000/test-new-architecture

## Debug & Demo Toggles

- The data-rich debug panel (used heavily by the Playwright suite) is enabled by default in all non-production builds.  
  Set `NEXT_PUBLIC_SHOW_DEBUG_PANEL=false` in `.env.local` if you need to hide it for demos or screenshots; rerun `npm run dev` after changing the flag.
- Manual sessions boot with a centered demo pontoon for visual reference.  
  Set `NEXT_PUBLIC_SHOW_DEMO_PONTOON=false` when you need an empty grid (all automated tests do this).

## Linting & Tests

```bash
npm run lint
npm test          # Playwright headless
npm run test:ui   # Playwright UI mode
```

Linting is configured via flat ESLint config (`eslint.config.mjs`) and now targets only the active code paths.

- The Playwright helper server binds to `http://localhost:3100` to avoid clashing with manual `npm run dev` sessions.  
  Override with `PLAYWRIGHT_TEST_PORT=<port>` if you need a different target.

## Next Steps

- Flesh out unfinished tools (select/move/rotate/paint) inside `NewPontoonConfigurator`
- Extend domain services with export, undo/redo, and manufacturing data hooks
- Continue migrating Playwright coverage as new features land

## Backup & Rollback

- Snapshot: `project-backup-YYYYMMDD-HHMMSS.tar.gz`
- Rollback guide: `docs/rendering-engine-rollback.md`

These artifacts let you recover the legacy project if required while keeping the active codebase clean and focused on the new architecture.
