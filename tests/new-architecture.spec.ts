/**
 * New Architecture - Critical Playwright Tests
 * 
 * Tests the core problems that the new architecture solves:
 * 1. Click precision ("click around until it works")
 * 2. Preview accuracy (hover != click behavior)
 * 3. Multi-level placement consistency
 */

import { test, expect } from '@playwright/test';

test.describe('New Architecture - Critical Tests', () => {
  // These tests interact with a heavy WebGL scene; running them serially reduces flakiness,
  // especially for timing-sensitive assertions.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    page.on('pageerror', error => {
      console.error('🧨 Page error:', error);
    });
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('🧨 Console error:', msg.text());
      }
    });

    // Navigate to new architecture test page
    await page.goto('/test-new-architecture');
    
    // Wait for Three.js to initialize
    await page.waitForTimeout(3000);
  });

  test('CRITICAL: Click precision - should place pontoon on first click', async ({ page }) => {
    console.log('🎯 Testing click precision with new EventPipeline...');

    // Ensure we're in place mode
    await page.click('[data-testid="tool-place"]', { timeout: 5000 });
    
    // Ensure we're on Level 0
    await page.click('[data-testid="level-0"]', { timeout: 5000 });
    
    // Get canvas element
    const canvas = page.locator('canvas[data-pontoon-canvas="true"]');
    await expect(canvas).toBeVisible();
    
    // Get canvas dimensions
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    
    // Calculate center point
    const centerX = canvasBox.x + canvasBox.width / 2;
    const centerY = canvasBox.y + canvasBox.height / 2;
    
    // Single click at center - should work immediately
    await canvas.click({ 
      position: { x: canvasBox.width / 2, y: canvasBox.height / 2 }
    });
    
    // Wait for placement processing
    await page.waitForTimeout(500);
    
    // Check debug panel for success
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    if (await debugPanel.isVisible()) {
      const clickResult = await debugPanel.locator('text=Last-Click:').textContent();
      console.log('Click Result:', clickResult);
      
      // Should show SUCCESS, not WRONG_LEVEL or failure
      expect(clickResult).toContain('SUCCESS');
    }
    
    // Alternative: Check pontoon count increased
    const pontoonCount = await page.locator('[data-testid="pontoon-count"]').textContent();
    const count = parseInt(pontoonCount || '0');
    expect(count).toBeGreaterThan(0);
    
    console.log('✅ Click precision test passed - pontoon placed on first click');
  });

  test('CRITICAL: Preview accuracy - hover should predict click success', async ({ page }) => {
    console.log('🎯 Testing preview accuracy vs actual placement...');

    // Ensure place mode and Level 0
    await page.click('[data-testid="tool-place"]', { timeout: 5000 });
    await page.click('[data-testid="level-0"]', { timeout: 5000 });
    
    const canvas = page.locator('canvas[data-pontoon-canvas="true"]');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    
    // Test multiple positions for preview vs placement consistency
    const testPositions = [
      { x: canvasBox.width * 0.3, y: canvasBox.height * 0.3 },
      { x: canvasBox.width * 0.7, y: canvasBox.height * 0.3 },
      { x: canvasBox.width * 0.5, y: canvasBox.height * 0.7 }
    ];
    
    for (const position of testPositions) {
      // Hover to trigger preview
      await canvas.hover({ position });
      await page.waitForTimeout(200);
      
      // Check if preview shows "can place"
      const debugPanel = page.locator('[data-testid="debug-panel"]');
      let canPlaceFromPreview = false;
      
      if (await debugPanel.isVisible()) {
        const canPlaceText = await debugPanel.locator('text=Grid-Cell-Can-Place:').textContent();
        canPlaceFromPreview = canPlaceText?.includes('✅') || false;
        console.log('Preview says can place:', canPlaceFromPreview, 'at', position);
      }
      
      // Click at same position
      await canvas.click({ position });
      await page.waitForTimeout(300);
      
      // Check actual placement result
      const clickResult = await debugPanel.locator('text=Last-Click:').textContent();
      const placementSucceeded = clickResult?.includes('SUCCESS') || false;
      console.log('Actual placement succeeded:', placementSucceeded);
      
      // CRITICAL: Preview should match placement
      if (canPlaceFromPreview) {
        expect(placementSucceeded).toBe(true);
        console.log('✅ Preview correctly predicted successful placement');
      } else {
        expect(placementSucceeded).toBe(false);
        console.log('✅ Preview correctly predicted failed placement');
      }
    }
  });

  test('CRITICAL: Multi-level placement - Level 1 requires Level 0 support', async ({ page }) => {
    console.log('🎯 Testing multi-level placement with new domain layer...');

    // Place pontoon on Level 0 first
    await page.click('[data-testid="tool-place"]', { timeout: 5000 });
    await page.click('[data-testid="level-0"]', { timeout: 5000 });
    
    const canvas = page.locator('canvas[data-pontoon-canvas="true"]');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    
    const centerPos = { x: canvasBox.width / 2, y: canvasBox.height / 2 };
    
    // Place Level 0 pontoon
    await canvas.click({ position: centerPos });
    await page.waitForTimeout(500);
    
    // Verify Level 0 placement
    let pontoonCount = await page.locator('[data-testid="pontoon-count"]').textContent();
    expect(parseInt(pontoonCount || '0')).toBe(1);
    console.log('✅ Level 0 pontoon placed successfully');
    
    // Switch to Level 1
    await page.click('[data-testid="level-1"]', { timeout: 5000 });
    await page.waitForTimeout(500);
    
    // Try to place Level 1 pontoon at SAME position (should work - has support)
    await canvas.click({ position: centerPos });
    await page.waitForTimeout(500);
    
    // Should have 2 pontoons now
    pontoonCount = await page.locator('[data-testid="pontoon-count"]').textContent();
    expect(parseInt(pontoonCount || '0')).toBe(2);
    console.log('✅ Level 1 placement with support succeeded');
    
    // Try to place Level 1 pontoon at DIFFERENT position (should fail - no support)
    const noSupportPos = { x: centerPos.x + 100, y: centerPos.y + 100 };
    await canvas.click({ position: noSupportPos });
    await page.waitForTimeout(500);
    
    // Should still have only 2 pontoons
    pontoonCount = await page.locator('[data-testid="pontoon-count"]').textContent();
    expect(parseInt(pontoonCount || '0')).toBe(2);
    console.log('✅ Level 1 placement without support correctly failed');
  });

  test('CRITICAL: Double pontoon support validation', async ({ page }) => {
    console.log('🎯 Testing double pontoon placement requiring dual support...');

    // Switch to double pontoon mode
    await page.click('[data-testid="tool-place"]', { timeout: 5000 });
    await page.click('[data-testid="pontoon-double"]', { timeout: 5000 });
    await page.click('[data-testid="level-0"]', { timeout: 5000 });
    
    const canvas = page.locator('canvas[data-pontoon-canvas="true"]');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    
    // Place double pontoon on Level 0
    const centerPos = { x: canvasBox.width / 2, y: canvasBox.height / 2 };
    await canvas.click({ position: centerPos });
    await page.waitForTimeout(500);
    
    // Should have 1 double pontoon
    let pontoonCount = await page.locator('[data-testid="pontoon-count"]').textContent();
    expect(parseInt(pontoonCount || '0')).toBe(1);
    console.log('✅ Double pontoon placed on Level 0');
    
    // Switch to Level 1
    await page.click('[data-testid="level-1"]', { timeout: 5000 });
    
    // Try to place double pontoon on Level 1 at same position
    // Should work because double pontoon on Level 0 provides complete support
    await canvas.click({ position: centerPos });
    await page.waitForTimeout(500);
    
    // Should have 2 pontoons now
    pontoonCount = await page.locator('[data-testid="pontoon-count"]').textContent();
    expect(parseInt(pontoonCount || '0')).toBe(2);
    console.log('✅ Double pontoon on Level 1 with complete support succeeded');
    
    // Switch back to single pontoon mode
    await page.click('[data-testid="pontoon-single"]', { timeout: 5000 });
    
    // Try to place single pontoon at offset position (should fail - no support)
    const offsetPos = { x: centerPos.x + 150, y: centerPos.y };
    await canvas.click({ position: offsetPos });
    await page.waitForTimeout(500);
    
    // Should still have only 2 pontoons
    pontoonCount = await page.locator('[data-testid="pontoon-count"]').textContent();
    expect(parseInt(pontoonCount || '0')).toBe(2);
    console.log('✅ Single pontoon without support correctly failed');
  });

  test('CRITICAL: Tool switching consistency', async ({ page }) => {
    console.log('🎯 Testing tool switching with EventPipeline...');

    const canvas = page.locator('canvas[data-pontoon-canvas="true"]');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    
    const centerPos = { x: canvasBox.width / 2, y: canvasBox.height / 2 };
    
    // Start with placement tool
    await page.click('[data-testid="tool-place"]', { timeout: 5000 });
    await page.click('[data-testid="level-0"]', { timeout: 5000 });
    
    // Place a pontoon
    await canvas.click({ position: centerPos });
    await page.waitForTimeout(500);
    
    let pontoonCount = await page.locator('[data-testid="pontoon-count"]').textContent();
    expect(parseInt(pontoonCount || '0')).toBe(1);
    console.log('✅ Placement tool works');
    
    // Switch to delete tool
    await page.click('[data-testid="tool-delete"]', { timeout: 5000 });
    
    // Click on same pontoon to delete it
    await canvas.click({ position: centerPos });
    await page.waitForTimeout(500);
    
    pontoonCount = await page.locator('[data-testid="pontoon-count"]').textContent();
    expect(parseInt(pontoonCount || '0')).toBe(0);
    console.log('✅ Delete tool works');
    
    // Switch back to placement and place another pontoon
    await page.click('[data-testid="tool-place"]', { timeout: 5000 });
    await canvas.click({ position: centerPos });
    await page.waitForTimeout(500);
    
    pontoonCount = await page.locator('[data-testid="pontoon-count"]').textContent();
    expect(parseInt(pontoonCount || '0')).toBe(1);
    console.log('✅ Tool switching maintains consistency');
  });

  test('PERFORMANCE: Click response time under 100ms', async ({ page }) => {
    console.log('🎯 Testing click response time performance...');

    await page.click('[data-testid="tool-place"]', { timeout: 5000 });
    await page.click('[data-testid="level-0"]', { timeout: 5000 });
    
    const canvas = page.locator('canvas[data-pontoon-canvas="true"]');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    
    const testPositions = [
      { x: canvasBox.width * 0.3, y: canvasBox.height * 0.3 },
      { x: canvasBox.width * 0.7, y: canvasBox.height * 0.3 },
      { x: canvasBox.width * 0.5, y: canvasBox.height * 0.7 }
    ];
    
    const responseTimes: number[] = [];
    
    for (const position of testPositions) {
      const startTime = Date.now();
      
      await canvas.click({ position });
      
      // Wait for debug panel to update with result
      await page.waitForFunction(() => {
        const panel = document.querySelector('[data-testid="debug-panel"]');
        return panel?.textContent?.includes('Last-Click:');
      }, { timeout: 1000 });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      responseTimes.push(responseTime);
      
      console.log(`Click response time: ${responseTime}ms`);
      
      // Each click should respond within 100ms
      expect(responseTime).toBeLessThan(100);
      
      await page.waitForTimeout(100); // Brief pause between clicks
    }
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    console.log(`✅ Average response time: ${avgResponseTime.toFixed(2)}ms`);
  });

  test('REGRESSION: No "click around until it works" behavior', async ({ page }) => {
    console.log('🎯 Testing against regression of the main bug...');

    await page.click('[data-testid="tool-place"]', { timeout: 5000 });
    await page.click('[data-testid="level-0"]', { timeout: 5000 });
    // Use single pontoons to avoid edge-of-grid failures for double width placements.
    await page.click('[data-testid="pontoon-single"]', { timeout: 5000 });
    
    const canvas = page.locator('canvas[data-pontoon-canvas="true"]');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    
    // Test the exact scenario that used to fail:
    // Rapid clicks at the same logical position
    const targetPos = { x: canvasBox.width / 2, y: canvasBox.height / 2 };
    
    // Click multiple times rapidly at same position
    for (let i = 0; i < 5; i++) {
      await canvas.click({ position: targetPos });
      await page.waitForTimeout(50); // Very fast clicks
    }
    
    // Should have exactly 1 pontoon (first click worked, others were no-ops on occupied cell)
    const pontoonCount = await page.locator('[data-testid="pontoon-count"]').textContent();
    expect(parseInt(pontoonCount || '0')).toBe(1);
    
    console.log('✅ No "click around until it works" - first click succeeded, others correctly ignored');
    
    // Clear and test different positions
    await page.click('[data-testid="tool-delete"]', { timeout: 5000 });
    await canvas.click({ position: targetPos });
    await page.waitForTimeout(200);

    await expect(page.locator('[data-testid="pontoon-count"]')).toHaveText('0', { timeout: 2000 });
    
    await page.click('[data-testid="tool-place"]', { timeout: 5000 });
    await page.click('[data-testid="pontoon-single"]', { timeout: 5000 });
    
    // Test 5 different positions - each should work on first try
    // Keep clicks safely inside the visible grid; large offsets can fall outside the grid
    // and produce out-of-bounds conversions on some camera/viewports.
    const offsetX = Math.min(80, canvasBox.width * 0.12);
    const offsetY = Math.min(80, canvasBox.height * 0.12);
    const positions = [
      // Use positions relative to center to stay within the grid and avoid overlay UI.
      { x: targetPos.x - offsetX, y: targetPos.y - offsetY },
      { x: targetPos.x + offsetX, y: targetPos.y - offsetY },
      { x: targetPos.x - offsetX, y: targetPos.y + offsetY },
      { x: targetPos.x + offsetX, y: targetPos.y + offsetY },
      { x: targetPos.x, y: targetPos.y }
    ];
    
    for (let i = 0; i < positions.length; i++) {
      await canvas.click({ position: positions[i] });
      await expect(page.locator('[data-testid="pontoon-count"]')).toHaveText(String(i + 1), { timeout: 2000 });
    }
    
    console.log('✅ All 5 positions placed successfully on first click - no retry behavior needed');
  });
});
