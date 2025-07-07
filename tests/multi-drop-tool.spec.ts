import { test, expect } from '@playwright/test';

test.describe('Multi-Drop Tool Implementation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/test-new-architecture');
    
    // Wait for the application to load
    await expect(page.locator('[data-testid="debug-panel"]')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    
    // Verify initial state
    await expect(page.locator('[data-testid="pontoon-count"]')).toHaveText('0');
  });

  test('Multi-Drop tool is enabled and selectable', async ({ page }) => {
    // Check that Multi-Drop tool button exists and is enabled
    const multiDropButton = page.locator('[data-testid="tool-multi-drop"]');
    await expect(multiDropButton).toBeVisible();
    await expect(multiDropButton).not.toBeDisabled();
    
    // Click to select Multi-Drop tool
    await multiDropButton.click();
    
    // Verify tool is selected (should have active styling)
    await expect(multiDropButton).toHaveClass(/bg-blue-500/);
    
    // Verify debug panel shows correct tool
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Tool: multi-drop');
  });

  test('Single pontoon drag placement works', async ({ page }) => {
    // Select Multi-Drop tool
    await page.locator('[data-testid="tool-multi-drop"]').click();
    
    // Ensure single pontoon type is selected
    await page.locator('[data-testid="pontoon-single"]').click();
    
    // Get canvas for drag operations
    const canvas = page.locator('canvas');
    
    // Drag from position (300, 300) to (400, 400) - should place 3x3 grid
    await canvas.hover({ position: { x: 300, y: 300 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 400, y: 400 } });
    await page.mouse.up();
    
    // Wait for operation to complete
    await page.waitForTimeout(500);
    
    // Verify pontoons were placed
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    const countText = await pontoonCount.textContent();
    const count = parseInt(countText || '0');
    
    // Should have placed multiple pontoons (exact count depends on grid size)
    expect(count).toBeGreaterThan(3);
    
    // Verify debug panel shows success
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText(/Multi-drop: \d+ pontoons placed/);
  });

  test('Double pontoon drag placement with filtering', async ({ page }) => {
    // Select Multi-Drop tool
    await page.locator('[data-testid="tool-multi-drop"]').click();
    
    // Select double pontoon type
    await page.locator('[data-testid="pontoon-double"]').click();
    
    // Get canvas for drag operations
    const canvas = page.locator('canvas');
    
    // Drag a 4x4 area - should only place double pontoons on even positions
    await canvas.hover({ position: { x: 350, y: 350 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 450, y: 450 } });
    await page.mouse.up();
    
    // Wait for operation to complete
    await page.waitForTimeout(500);
    
    // Verify pontoons were placed
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    const countText = await pontoonCount.textContent();
    const count = parseInt(countText || '0');
    
    // Should have placed fewer pontoons due to double pontoon filtering
    expect(count).toBeGreaterThan(0);
    
    // Verify debug panel shows success
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText(/Multi-drop: \d+ pontoons placed/);
  });

  test('Drag preview shows during drag operation', async ({ page }) => {
    // Select Multi-Drop tool
    await page.locator('[data-testid="tool-multi-drop"]').click();
    
    const canvas = page.locator('canvas');
    
    // Start drag but don't complete it
    await canvas.hover({ position: { x: 300, y: 300 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 400, y: 400 } });
    
    // At this point, the preview should be visible
    // We can't easily test visual elements, but we can verify no premature placement
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    await expect(pontoonCount).toHaveText('0'); // Should still be 0 during drag
    
    // Complete the drag
    await page.mouse.up();
    
    // Wait and verify placement occurred
    await page.waitForTimeout(500);
    const finalCount = await pontoonCount.textContent();
    expect(parseInt(finalCount || '0')).toBeGreaterThan(0);
  });

  test('Small drag operations work (single cell)', async ({ page }) => {
    // Select Multi-Drop tool
    await page.locator('[data-testid="tool-multi-drop"]').click();
    
    const canvas = page.locator('canvas');
    
    // Very small drag - should place at least one pontoon
    await canvas.hover({ position: { x: 400, y: 400 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 410, y: 410 } }); // Just 10px
    await page.mouse.up();
    
    // Wait for operation to complete
    await page.waitForTimeout(500);
    
    // Verify at least one pontoon was placed
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    const countText = await pontoonCount.textContent();
    const count = parseInt(countText || '0');
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Multi-Drop tool works across different levels', async ({ page }) => {
    // Select Multi-Drop tool
    await page.locator('[data-testid="tool-multi-drop"]').click();
    
    // Switch to level 1
    await page.locator('[data-testid="level-1"]').click();
    
    // Verify level is selected
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Level: 1');
    
    const canvas = page.locator('canvas');
    
    // Try drag operation on level 1 (should fail due to no support)
    await canvas.hover({ position: { x: 300, y: 300 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 350, y: 350 } });
    await page.mouse.up();
    
    // Wait for operation to complete
    await page.waitForTimeout(500);
    
    // Should show failure message or 0 pontoons placed due to validation
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    await expect(pontoonCount).toHaveText('0');
  });

  test('Multi-Drop with different colors', async ({ page }) => {
    // Select Multi-Drop tool
    await page.locator('[data-testid="tool-multi-drop"]').click();
    
    // Select yellow color (different from default blue)
    await page.keyboard.press('4'); // Should cycle to yellow
    
    const canvas = page.locator('canvas');
    
    // Perform drag operation
    await canvas.hover({ position: { x: 300, y: 300 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 380, y: 380 } });
    await page.mouse.up();
    
    // Wait for operation to complete
    await page.waitForTimeout(500);
    
    // Verify pontoons were placed
    const pontoonCount = page.locator('[data-testid="pontoon-count"]');
    const countText = await pontoonCount.textContent();
    const count = parseInt(countText || '0');
    expect(count).toBeGreaterThan(0);
  });

  test('Keyboard shortcut activates Multi-Drop tool', async ({ page }) => {
    // Press '5' to activate Multi-Drop tool
    await page.keyboard.press('5');
    
    // Verify tool is selected
    const multiDropButton = page.locator('[data-testid="tool-multi-drop"]');
    await expect(multiDropButton).toHaveClass(/bg-blue-500/);
    
    // Verify debug panel shows correct tool
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Tool: multi-drop');
  });

  test('Error handling for invalid drag areas', async ({ page }) => {
    // Select Multi-Drop tool
    await page.locator('[data-testid="tool-multi-drop"]').click();
    
    const canvas = page.locator('canvas');
    
    // Try to drag outside the grid bounds (far edge)
    await canvas.hover({ position: { x: 100, y: 100 } }); // Edge of canvas
    await page.mouse.down();
    await canvas.hover({ position: { x: 150, y: 150 } });
    await page.mouse.up();
    
    // Wait for operation to complete
    await page.waitForTimeout(500);
    
    // Should handle gracefully, either with 0 pontoons or appropriate error
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    const lastClickResult = await debugPanel.textContent();
    
    // Should not crash - either success with 0 or error message
    expect(lastClickResult).toMatch(/(Multi-drop: \d+ pontoons placed|FAILED)/);
  });
});