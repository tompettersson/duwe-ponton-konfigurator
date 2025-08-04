import { test, expect } from '@playwright/test';

/**
 * Enhanced Multi-Drop Tool Tests for Safari Browser
 * 
 * Tests comprehensive functionality including:
 * - Single-click placement
 * - Drag-to-place multiple pontoons
 * - Enhanced debug panel display
 * - Drag preview functionality
 * - Double pontoon spacing
 * - Error handling
 */

test.describe('Enhanced Multi-Drop Tool Implementation', () => {
  test.beforeEach(async ({ page }) => {
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

  test('Debug panel shows enhanced Multi-Drop state information', async ({ page }) => {
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Check initial drag state
    await expect(debugPanel).toContainText('Drag-State: none');
    await expect(debugPanel).toContainText('Preview-Pontoons: 0');
    
    // Hover over canvas to get hover information
    const canvas = page.locator('canvas');
    await canvas.hover({ position: { x: 400, y: 400 } });
    
    // Wait for hover to register
    await page.waitForTimeout(100);
    
    // Should show hover coordinates
    await expect(debugPanel).toContainText(/Hover: \(\d+, \d+, \d+\)/);
    
    // Should show placement validation
    await expect(debugPanel).toContainText(/Grid-Cell-Can-Place: (✅|❌)/);
  });

  test('Single-click placement works like Place tool', async ({ page }) => {
    const canvas = page.locator('canvas');
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Single click at center
    await canvas.click({ position: { x: 400, y: 400 } });
    
    // Wait for placement
    await page.waitForTimeout(500);
    
    // Should have placed exactly one pontoon
    await expect(page.locator('[data-testid="pontoon-count"]')).toHaveText('1');
    
    // Debug panel should show success
    await expect(debugPanel).toContainText(/Last-Click: SUCCESS/);
  });

  test('Drag operation shows live preview and area information', async ({ page }) => {
    const canvas = page.locator('canvas');
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Start drag
    await canvas.hover({ position: { x: 300, y: 300 } });
    await page.mouse.down();
    
    // Wait for drag to be detected
    await page.waitForTimeout(100);
    
    // Should show drag state as active
    await expect(debugPanel).toContainText('Drag-State: active');
    
    // Move during drag
    await canvas.hover({ position: { x: 450, y: 450 } });
    await page.waitForTimeout(100);
    
    // Should show drag area coordinates
    await expect(debugPanel).toContainText(/Drag-Area: \(\d+,\d+\) to \(\d+,\d+\)/);
    
    // Should show preview pontoon count
    await expect(debugPanel).toContainText(/Preview-Pontoons: \d+/);
    
    // Should show it's greater than 0
    const previewText = await debugPanel.textContent();
    const previewMatch = previewText?.match(/Preview-Pontoons: (\d+)/);
    if (previewMatch) {
      const previewCount = parseInt(previewMatch[1]);
      expect(previewCount).toBeGreaterThan(0);
    }
    
    // Complete drag
    await page.mouse.up();
    
    // Wait for completion
    await page.waitForTimeout(500);
    
    // Should show drag state as none again
    await expect(debugPanel).toContainText('Drag-State: none');
    
    // Should show preview pontoons reset to 0
    await expect(debugPanel).toContainText('Preview-Pontoons: 0');
    
    // Should have placed pontoons
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    const countText = await pontoonCount.textContent();
    const count = parseInt(countText || '0');
    expect(count).toBeGreaterThan(1);
  });

  test('Double pontoon mode shows correct filtering in debug panel', async ({ page }) => {
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Select double pontoon type
    await page.locator('[data-testid="pontoon-double"]').click();
    
    // Wait for selection
    await page.waitForTimeout(100);
    
    const canvas = page.locator('canvas');
    
    // Start drag
    await canvas.hover({ position: { x: 300, y: 300 } });
    await page.mouse.down();
    
    // Move to create a significant area
    await canvas.hover({ position: { x: 500, y: 500 } });
    await page.waitForTimeout(100);
    
    // Should show Multi-Drop mode for double pontoons
    await expect(debugPanel).toContainText('Multi-Drop-Mode: Double (every 2nd)');
    
    // Should show preview pontoons (filtered count)
    await expect(debugPanel).toContainText(/Preview-Pontoons: \d+/);
    
    // Complete drag
    await page.mouse.up();
    
    // Wait for completion
    await page.waitForTimeout(500);
    
    // Should have placed some pontoons
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    const countText = await pontoonCount.textContent();
    const count = parseInt(countText || '0');
    expect(count).toBeGreaterThan(0);
  });

  test('Single pontoon mode shows correct mode in debug panel', async ({ page }) => {
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Ensure single pontoon is selected
    await page.locator('[data-testid="pontoon-single"]').click();
    
    const canvas = page.locator('canvas');
    
    // Start drag
    await canvas.hover({ position: { x: 350, y: 350 } });
    await page.mouse.down();
    
    // Move to create area
    await canvas.hover({ position: { x: 450, y: 450 } });
    await page.waitForTimeout(100);
    
    // Should show Multi-Drop mode for single pontoons
    await expect(debugPanel).toContainText('Multi-Drop-Mode: Single');
    
    // Complete drag
    await page.mouse.up();
    
    // Wait for completion
    await page.waitForTimeout(500);
    
    // Should have placed pontoons
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    const countText = await pontoonCount.textContent();
    const count = parseInt(countText || '0');
    expect(count).toBeGreaterThan(0);
  });

  test('Drag preview clears properly when operation completes', async ({ page }) => {
    const canvas = page.locator('canvas');
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Perform complete drag operation
    await canvas.hover({ position: { x: 300, y: 300 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 400, y: 400 } });
    await page.mouse.up();
    
    // Wait for operation to complete
    await page.waitForTimeout(500);
    
    // All drag state should be cleared
    await expect(debugPanel).toContainText('Drag-State: none');
    await expect(debugPanel).toContainText('Preview-Pontoons: 0');
    
    // Should not show drag area anymore
    await expect(debugPanel).not.toContainText(/Drag-Area: \(\d+,\d+\) to \(\d+,\d+\)/);
    
    // Should not show multi-drop mode
    await expect(debugPanel).not.toContainText('Multi-Drop-Mode:');
  });

  test('Drag operation across different levels handles validation', async ({ page }) => {
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Switch to level 1 (requires support from level 0)
    await page.locator('[data-testid="level-1"]').click();
    
    // Verify level change
    await expect(debugPanel).toContainText('Level: 1');
    
    const canvas = page.locator('canvas');
    
    // Start drag on level 1
    await canvas.hover({ position: { x: 350, y: 350 } });
    await page.mouse.down();
    
    // Move to create area
    await canvas.hover({ position: { x: 450, y: 450 } });
    await page.waitForTimeout(100);
    
    // Should show drag state and preview (even if invalid)
    await expect(debugPanel).toContainText('Drag-State: active');
    await expect(debugPanel).toContainText(/Preview-Pontoons: \d+/);
    
    // Complete drag
    await page.mouse.up();
    
    // Wait for completion
    await page.waitForTimeout(500);
    
    // Should fail or place 0 pontoons due to validation
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    await expect(pontoonCount).toHaveText('0');
    
    // Should show appropriate error or result
    await expect(debugPanel).toContainText(/Multi-drop: 0 pontoons placed|FAILED/);
  });

  test('Small drag areas work correctly', async ({ page }) => {
    const canvas = page.locator('canvas');
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Very small drag (should still work)
    await canvas.hover({ position: { x: 400, y: 400 } });
    await page.mouse.down();
    
    // Move just a few pixels
    await canvas.hover({ position: { x: 415, y: 415 } });
    await page.waitForTimeout(100);
    
    // Should still show drag state
    await expect(debugPanel).toContainText('Drag-State: active');
    
    // Should show at least 1 preview pontoon
    await expect(debugPanel).toContainText(/Preview-Pontoons: [1-9]\d*/);
    
    // Complete drag
    await page.mouse.up();
    
    // Wait for completion
    await page.waitForTimeout(500);
    
    // Should have placed at least 1 pontoon
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    const countText = await pontoonCount.textContent();
    const count = parseInt(countText || '0');
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Debug panel updates correctly during hover without drag', async ({ page }) => {
    const canvas = page.locator('canvas');
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Hover without starting drag
    await canvas.hover({ position: { x: 400, y: 400 } });
    await page.waitForTimeout(100);
    
    // Should show hover info but no drag state
    await expect(debugPanel).toContainText(/Hover: \(\d+, \d+, \d+\)/);
    await expect(debugPanel).toContainText('Drag-State: none');
    await expect(debugPanel).toContainText('Preview-Pontoons: 0');
    
    // Move hover position
    await canvas.hover({ position: { x: 450, y: 450 } });
    await page.waitForTimeout(100);
    
    // Should update hover coordinates
    await expect(debugPanel).toContainText(/Hover: \(\d+, \d+, \d+\)/);
    
    // Should still show no drag state
    await expect(debugPanel).toContainText('Drag-State: none');
  });

  test('Batch operation results are reported correctly', async ({ page }) => {
    const canvas = page.locator('canvas');
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Perform large drag operation
    await canvas.hover({ position: { x: 250, y: 250 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 550, y: 550 } });
    await page.mouse.up();
    
    // Wait for operation to complete
    await page.waitForTimeout(1000);
    
    // Should show batch operation result
    await expect(debugPanel).toContainText(/Multi-drop: \d+ pontoons placed/);
    
    // Extract the count from the message
    const debugText = await debugPanel.textContent();
    const resultMatch = debugText?.match(/Multi-drop: (\d+) pontoons placed/);
    
    if (resultMatch) {
      const placedCount = parseInt(resultMatch[1]);
      expect(placedCount).toBeGreaterThan(5); // Should place many pontoons
      
      // Verify the pontoon count matches
      const pontoonCount = page.locator('[data-testid="pontoon-count"]');
      await expect(pontoonCount).toHaveText(placedCount.toString());
    }
  });

  test('Color selection affects multi-drop operations', async ({ page }) => {
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Select different color (cycle through colors)
    await page.keyboard.press('2'); // Should select black
    await page.waitForTimeout(100);
    
    // Verify color changed
    await expect(debugPanel).toContainText('Current-Color: black');
    
    const canvas = page.locator('canvas');
    
    // Perform drag operation
    await canvas.hover({ position: { x: 350, y: 350 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 450, y: 450 } });
    await page.mouse.up();
    
    // Wait for completion
    await page.waitForTimeout(500);
    
    // Should have placed pontoons
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    const countText = await pontoonCount.textContent();
    const count = parseInt(countText || '0');
    expect(count).toBeGreaterThan(0);
    
    // Should show success message
    await expect(debugPanel).toContainText(/Multi-drop: \d+ pontoons placed/);
  });

  test('Edge case: drag outside canvas boundaries', async ({ page }) => {
    const canvas = page.locator('canvas');
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Start drag near edge
    await canvas.hover({ position: { x: 50, y: 50 } });
    await page.mouse.down();
    
    // Try to drag outside (should handle gracefully)
    await canvas.hover({ position: { x: 100, y: 100 } });
    await page.mouse.up();
    
    // Wait for completion
    await page.waitForTimeout(500);
    
    // Should handle gracefully - either place 0 or show error
    const lastClickText = await debugPanel.textContent();
    expect(lastClickText).toMatch(/(Multi-drop: \d+ pontoons placed|FAILED)/);
    
    // Should reset drag state
    await expect(debugPanel).toContainText('Drag-State: none');
    await expect(debugPanel).toContainText('Preview-Pontoons: 0');
  });
});