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
