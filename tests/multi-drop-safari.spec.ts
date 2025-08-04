import { test, expect } from '@playwright/test';

/**
 * Safari-specific Multi-Drop Tool Tests
 * 
 * These tests are designed to run specifically on Safari (webkit) browser
 * to ensure compatibility and catch Safari-specific issues
 */

// Force these tests to run only on Safari
test.describe('Multi-Drop Tool - Safari Browser Tests', () => {
  test.beforeEach(async ({ page, browserName }) => {
    // Skip if not Safari/webkit
    test.skip(browserName !== 'webkit', 'These tests are Safari-specific');
    
    await page.goto('http://localhost:3000/test-new-architecture');
    
    // Wait for the application to load
    await expect(page.locator('[data-testid="debug-panel"]')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    
    // Verify initial state
    await expect(page.locator('[data-testid="pontoon-count"]')).toHaveText('0');
    
    // Select Multi-Drop tool
    await page.locator('[data-testid="tool-multi-drop"]').click();
    
    // Verify tool is selected
    await expect(page.locator('[data-testid="debug-panel"]')).toContainText('Tool: multi-drop');
  });

  test('Safari: Multi-Drop tool activation and UI state', async ({ page }) => {
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Verify initial state is correct in Safari
    await expect(debugPanel).toContainText('Tool: multi-drop');
    await expect(debugPanel).toContainText('Drag-State: none');
    await expect(debugPanel).toContainText('Preview-Pontoons: 0');
    
    // Verify tool button has correct active state
    const multiDropButton = page.locator('[data-testid="tool-multi-drop"]');
    await expect(multiDropButton).toHaveClass(/bg-blue-500/);
  });

  test('Safari: Mouse events and drag detection', async ({ page }) => {
    const canvas = page.locator('canvas');
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Test mouse hover events in Safari
    await canvas.hover({ position: { x: 400, y: 400 } });
    await page.waitForTimeout(150); // Safari may need more time
    
    // Should show hover coordinates
    await expect(debugPanel).toContainText(/Hover: \(\d+, \d+, \d+\)/);
    
    // Test drag start detection
    await page.mouse.down();
    await canvas.hover({ position: { x: 450, y: 450 } });
    await page.waitForTimeout(150);
    
    // Should detect drag in Safari
    await expect(debugPanel).toContainText('Drag-State: active');
    await expect(debugPanel).toContainText(/Preview-Pontoons: \d+/);
    
    // Complete drag
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Should complete successfully
    await expect(debugPanel).toContainText('Drag-State: none');
    
    // Should have placed pontoons
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    const countText = await pontoonCount.textContent();
    const count = parseInt(countText || '0');
    expect(count).toBeGreaterThan(0);
  });

  test('Safari: Single-click vs drag differentiation', async ({ page }) => {
    const canvas = page.locator('canvas');
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Test single click (no drag)
    await canvas.click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(500);
    
    // Should place exactly one pontoon
    await expect(page.locator('[data-testid="pontoon-count"]')).toHaveText('1');
    await expect(debugPanel).toContainText(/Last-Click: SUCCESS/);
    
    // Test drag operation
    await canvas.hover({ position: { x: 400, y: 400 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 500, y: 500 } });
    await page.mouse.up();
    
    await page.waitForTimeout(500);
    
    // Should place multiple pontoons
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    const countText = await pontoonCount.textContent();
    const count = parseInt(countText || '0');
    expect(count).toBeGreaterThan(1);
  });

  test('Safari: 3D canvas interaction and coordinate conversion', async ({ page }) => {
    const canvas = page.locator('canvas');
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Test multiple canvas positions to ensure coordinate conversion works
    const testPositions = [
      { x: 200, y: 200 },
      { x: 400, y: 400 },
      { x: 600, y: 600 }
    ];
    
    for (const pos of testPositions) {
      await canvas.hover({ position: pos });
      await page.waitForTimeout(100);
      
      // Should show valid hover coordinates
      await expect(debugPanel).toContainText(/Hover: \(\d+, \d+, \d+\)/);
      
      // Should show placement validation
      await expect(debugPanel).toContainText(/Grid-Cell-Can-Place: (✅|❌)/);
    }
  });

  test('Safari: WebGL and Three.js compatibility', async ({ page }) => {
    const canvas = page.locator('canvas');
    
    // Verify canvas is WebGL-enabled
    const webglSupported = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    });
    
    expect(webglSupported).toBe(true);
    
    // Test 3D interaction works
    await canvas.hover({ position: { x: 400, y: 400 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 500, y: 500 } });
    await page.mouse.up();
    
    await page.waitForTimeout(500);
    
    // Should complete without errors
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    const countText = await pontoonCount.textContent();
    const count = parseInt(countText || '0');
    expect(count).toBeGreaterThan(0);
  });

  test('Safari: Touch and pointer events compatibility', async ({ page }) => {
    const canvas = page.locator('canvas');
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Test touch-like interaction (Safari mobile compatibility)
    await canvas.tap({ position: { x: 350, y: 350 } });
    await page.waitForTimeout(500);
    
    // Should work like click
    await expect(page.locator('[data-testid="pontoon-count"]')).toHaveText('1');
    
    // Test drag with touch-like events
    await canvas.hover({ position: { x: 450, y: 450 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 550, y: 550 } });
    await page.mouse.up();
    
    await page.waitForTimeout(500);
    
    // Should complete successfully
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    const countText = await pontoonCount.textContent();
    const count = parseInt(countText || '0');
    expect(count).toBeGreaterThan(1);
  });

  test('Safari: Double pontoon spacing and preview', async ({ page }) => {
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Select double pontoon type
    await page.locator('[data-testid="pontoon-double"]').click();
    await page.waitForTimeout(100);
    
    const canvas = page.locator('canvas');
    
    // Test drag with double pontoons
    await canvas.hover({ position: { x: 300, y: 300 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 600, y: 600 } });
    await page.waitForTimeout(150);
    
    // Should show double pontoon mode
    await expect(debugPanel).toContainText('Multi-Drop-Mode: Double (every 2nd)');
    
    // Should show preview count (filtered for double pontoons)
    await expect(debugPanel).toContainText(/Preview-Pontoons: \d+/);
    
    // Complete drag
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Should place pontoons with proper spacing
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    const countText = await pontoonCount.textContent();
    const count = parseInt(countText || '0');
    expect(count).toBeGreaterThan(0);
  });

  test('Safari: Error handling and recovery', async ({ page }) => {
    const canvas = page.locator('canvas');
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Test drag at edge of canvas
    await canvas.hover({ position: { x: 50, y: 50 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 80, y: 80 } });
    await page.mouse.up();
    
    await page.waitForTimeout(500);
    
    // Should handle gracefully (no crash)
    await expect(debugPanel).toContainText('Drag-State: none');
    
    // Should show some result (success or failure)
    const lastClickText = await debugPanel.textContent();
    expect(lastClickText).toMatch(/(Multi-drop: \d+ pontoons placed|FAILED)/);
    
    // Application should remain functional
    await canvas.click({ position: { x: 400, y: 400 } });
    await page.waitForTimeout(500);
    
    // Should still work
    await expect(debugPanel).toContainText(/Last-Click: SUCCESS/);
  });

  test('Safari: Performance with large drag operations', async ({ page }) => {
    const canvas = page.locator('canvas');
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Record start time
    const startTime = Date.now();
    
    // Perform large drag operation
    await canvas.hover({ position: { x: 200, y: 200 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 700, y: 700 } });
    await page.mouse.up();
    
    // Wait for completion
    await page.waitForTimeout(1000);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete in reasonable time (less than 5 seconds)
    expect(duration).toBeLessThan(5000);
    
    // Should show batch result
    await expect(debugPanel).toContainText(/Multi-drop: \d+ pontoons placed/);
    
    // Extract count
    const debugText = await debugPanel.textContent();
    const resultMatch = debugText?.match(/Multi-drop: (\\d+) pontoons placed/);
    
    if (resultMatch) {
      const placedCount = parseInt(resultMatch[1]);
      expect(placedCount).toBeGreaterThan(10); // Should place many pontoons
      
      // Verify count matches
      const pontoonCount = page.locator('[data-testid="pontoon-count"]');
      await expect(pontoonCount).toHaveText(placedCount.toString());
    }
  });

  test('Safari: Keyboard shortcuts and accessibility', async ({ page }) => {
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Test keyboard shortcut to activate tool
    await page.keyboard.press('1'); // Switch to Place tool
    await expect(debugPanel).toContainText('Tool: place');
    
    await page.keyboard.press('5'); // Switch to Multi-Drop tool
    await expect(debugPanel).toContainText('Tool: multi-drop');
    
    // Test color cycling with keyboard
    await page.keyboard.press('2'); // Should change color
    await page.waitForTimeout(100);
    
    // Should show new color
    await expect(debugPanel).toContainText(/Current-Color: (blue|black|grey|yellow)/);
    
    // Test that keyboard shortcuts don't interfere with drag
    const canvas = page.locator('canvas');
    await canvas.hover({ position: { x: 400, y: 400 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 500, y: 500 } });
    await page.mouse.up();
    
    await page.waitForTimeout(500);
    
    // Should still work normally
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    const countText = await pontoonCount.textContent();
    const count = parseInt(countText || '0');
    expect(count).toBeGreaterThan(0);
  });
});