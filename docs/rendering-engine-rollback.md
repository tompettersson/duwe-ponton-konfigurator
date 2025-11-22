# Rendering Engine Rollout & Rollback Guide

This note documents the switch to the shared `RenderingEngine` in the new
architecture (`/test-new-architecture`) and how to get back to the legacy
fallback renderer if we discover regressions.

## Current Default

- `app/components/NewPontoonConfigurator.tsx` now always instantiates the
  `RenderingEngine`. The old inline `<mesh>` fallback has been removed.
- Hover previews, delete highlights, and multi-drop rectangles are all driven by
  `RenderingEngine.render()` using its dedicated groups (`hover-cell`,
  `preview`, `selection`, `placement-debug`).
- If you need to confirm you are on the new path, open
  `http://localhost:3000/test-new-architecture`, hover a grid cell with the
  Place tool active, and check the Three.js scene graph in React DevTools →
  `<Canvas>` → `hover-cell` group.

## Immediate Rollback (Git Revert)

1. Identify the commit that removed the fallback (look for a summary similar to
   `Adopt RenderingEngine for new architecture`).

   ```bash
   git log --oneline app/components/NewPontoonConfigurator.tsx | head
   ```

2. Revert that commit on your feature branch:

   ```bash
   git revert <commit-sha>
   ```

   The revert restores the `engineInactive` guard and the legacy `<mesh>`
   rendering blocks while keeping all other history intact.

3. Run `npm run lint` and `npm run dev` to make sure the revert compiles before
   pushing the emergency fix.

## Manual Toggle (Without Full Revert)

If you need a quick local toggle without touching history:

1. Re-introduce the `engineInactive` branch in `SceneContent`:

   ```tsx
   const engineInactive = !renderingEngineRef.current;
   if (engineInactive) {
     // paste the legacy render blocks for pontoons / previews / selection
     // from commit <pre-rollout-sha>.
   }
   ```

2. Comment out or guard calls to `RenderingEngine.render(...)` the same way.

3. When you are satisfied the fallback works, move the change into a proper
   revert (see previous section) so the repository history reflects the toggle.

## Related Files

- `app/components/NewPontoonConfigurator.tsx`
- `app/lib/ui/RenderingEngine.ts`
- `app/components/primitives/Pontoon.tsx` (legacy reference implementation)

Keep this document updated with the real commit hash once the rollout lands in
`main` so we always know which change to revert.
