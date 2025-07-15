/**
 * Select Tool Tests - Comprehensive validation using Chromium
 * 
 * Tests all Select Tool functionality including:
 * - Single-click selection
 * - Multi-select with Ctrl+click
 * - Selection clearing on empty space click
 * - Selection persistence across tool switches
 * - Visual feedback for selected pontoons
 * 
 * Uses debug panel text parsing for 95% automated testing
 */

import { test, expect } from '@playwright/test';

// Use Chromium to avoid conflicts with other instances
test.use({ 
  browserName: 'chromium',
  viewport: { width: 1920, height: 1080 }
});

// Configure to run tests only on chromium
test.describe.configure({ mode: 'parallel' });

test.describe('Select Tool Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the main route which now uses NewPontoonConfigurator
    await page.goto('http://localhost:3000/');
    
    // Wait for the page to load and debug panel to appear
    await page.waitForSelector('[data-testid="debug-panel"]', { timeout: 10000 });
    
    // Ensure Select tool is active
    await page.click('[data-testid="tool-select"]');
    
    // Wait for tool to be active
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: select');
    });
  });

  test('should show Select tool as active in debug panel', async ({ page }) => {
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Tool: select');
    await expect(debugPanel).toContainText('Selected-Pontoons: 0');
  });

  test('should place pontoons first for selection testing', async ({ page }) => {
    // Switch to Place tool temporarily
    await page.click('[data-testid="tool-place"]');
    
    // Wait for Place tool to be active
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: place');
    });
    
    // Place 3 pontoons in a row for testing
    const canvas = page.locator('canvas');
    
    // Place first pontoon at (25, 0, 25) - center of 50x50 grid
    await canvas.click({ position: { x: 960, y: 540 } });
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: SUCCESS');
    });
    
    // Place second pontoon to the right
    await canvas.click({ position: { x: 990, y: 540 } });
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: SUCCESS');
    });
    
    // Place third pontoon further right
    await canvas.click({ position: { x: 1020, y: 540 } });
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: SUCCESS');
    });
    
    // Switch back to Select tool
    await page.click('[data-testid="tool-select"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: select');
    });
  });

  test('should select single pontoon with normal click', async ({ page }) => {
    // First place a pontoon
    await page.click('[data-testid="tool-place"]');
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 960, y: 540 } });
    
    // Switch to Select tool
    await page.click('[data-testid="tool-select"]');
    
    // Click on the pontoon to select it
    await canvas.click({ position: { x: 960, y: 540 } });
    
    // Verify selection in debug panel
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Selected-Pontoons: 1');
    });
    
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Selected-Pontoons: 1');
    await expect(debugPanel).toContainText('Last-Click: Selected:');
  });

  test('should clear selection when clicking empty space', async ({ page }) => {
    // First place and select a pontoon
    await page.click('[data-testid="tool-place"]');
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 960, y: 540 } });
    
    await page.click('[data-testid="tool-select"]');
    await canvas.click({ position: { x: 960, y: 540 } });
    
    // Verify pontoon is selected
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Selected-Pontoons: 1');
    });
    
    // Click on empty space
    await canvas.click({ position: { x: 800, y: 400 } });
    
    // Verify selection is cleared
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Selected-Pontoons: 0');
    });
    
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Selected-Pontoons: 0');
    await expect(debugPanel).toContainText('Last-Click: Selection cleared');
  });

  test('should support multi-select with Ctrl+click', async ({ page }) => {
    // First place 3 pontoons
    await page.click('[data-testid="tool-place"]');
    const canvas = page.locator('canvas');
    
    await canvas.click({ position: { x: 960, y: 540 } });
    await canvas.click({ position: { x: 990, y: 540 } });
    await canvas.click({ position: { x: 1020, y: 540 } });
    
    // Switch to Select tool
    await page.click('[data-testid="tool-select"]');
    
    // Select first pontoon normally
    await canvas.click({ position: { x: 960, y: 540 } });
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Selected-Pontoons: 1');
    });
    
    // Ctrl+click second pontoon to add to selection
    await page.keyboard.down('Control');
    await canvas.click({ position: { x: 990, y: 540 } });
    await page.keyboard.up('Control');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Selected-Pontoons: 2');
    });
    
    // Ctrl+click third pontoon to add to selection
    await page.keyboard.down('Control');
    await canvas.click({ position: { x: 1020, y: 540 } });
    await page.keyboard.up('Control');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Selected-Pontoons: 3');
    });
    
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Selected-Pontoons: 3');
  });

  test('should deselect pontoon with Ctrl+click on selected pontoon', async ({ page }) => {
    // First place and select a pontoon
    await page.click('[data-testid="tool-place"]');
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 960, y: 540 } });
    
    await page.click('[data-testid="tool-select"]');
    await canvas.click({ position: { x: 960, y: 540 } });
    
    // Verify pontoon is selected
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Selected-Pontoons: 1');
    });
    
    // Ctrl+click the same pontoon to deselect it
    await page.keyboard.down('Control');
    await canvas.click({ position: { x: 960, y: 540 } });
    await page.keyboard.up('Control');
    
    // Verify pontoon is deselected
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Selected-Pontoons: 0');
    });
    
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Selected-Pontoons: 0');
    await expect(debugPanel).toContainText('Last-Click: Deselected:');
  });

  test('should preserve selection when Ctrl+clicking empty space', async ({ page }) => {
    // First place and select a pontoon
    await page.click('[data-testid="tool-place"]');
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 960, y: 540 } });
    
    await page.click('[data-testid="tool-select"]');
    await canvas.click({ position: { x: 960, y: 540 } });
    
    // Verify pontoon is selected
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Selected-Pontoons: 1');
    });
    
    // Ctrl+click empty space (should preserve selection)
    await page.keyboard.down('Control');
    await canvas.click({ position: { x: 800, y: 400 } });
    await page.keyboard.up('Control');
    
    // Verify selection is preserved
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Selected-Pontoons: 1');
    });
    
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Selected-Pontoons: 1');
    await expect(debugPanel).toContainText('Last-Click: Empty space (Ctrl held - selection preserved)');
  });

  test('should maintain selection when switching tools', async ({ page }) => {
    // First place and select a pontoon
    await page.click('[data-testid="tool-place"]');
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 960, y: 540 } });
    
    await page.click('[data-testid="tool-select"]');
    await canvas.click({ position: { x: 960, y: 540 } });
    
    // Verify pontoon is selected
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Selected-Pontoons: 1');
    });
    
    // Switch to Place tool
    await page.click('[data-testid="tool-place"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: place');
    });
    
    // Verify selection is still maintained
    let debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Selected-Pontoons: 1');
    
    // Switch to Delete tool
    await page.click('[data-testid="tool-delete"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: delete');
    });
    
    // Verify selection is still maintained
    debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Selected-Pontoons: 1');
    
    // Switch back to Select tool
    await page.click('[data-testid="tool-select"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: select');
    });
    
    // Verify selection is still maintained
    debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Selected-Pontoons: 1');
  });

  test('should show selected pontoon IDs in debug panel', async ({ page }) => {
    // First place 2 pontoons
    await page.click('[data-testid="tool-place"]');
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 960, y: 540 } });
    await canvas.click({ position: { x: 990, y: 540 } });
    
    // Switch to Select tool
    await page.click('[data-testid="tool-select"]');
    
    // Select first pontoon
    await canvas.click({ position: { x: 960, y: 540 } });
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Selected-Pontoons: 1');
    });
    
    // Check that Selected-IDs line appears
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Selected-IDs:');
    
    // Select second pontoon with Ctrl+click
    await page.keyboard.down('Control');
    await canvas.click({ position: { x: 990, y: 540 } });
    await page.keyboard.up('Control');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Selected-Pontoons: 2');
    });
    
    // Should show both pontoon IDs
    await expect(debugPanel).toContainText('Selected-IDs:');
    await expect(debugPanel).toContainText('Selected-Pontoons: 2');
  });

  test('should handle rapid clicking without errors', async ({ page }) => {
    // First place 3 pontoons
    await page.click('[data-testid="tool-place"]');
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 960, y: 540 } });
    await canvas.click({ position: { x: 990, y: 540 } });
    await canvas.click({ position: { x: 1020, y: 540 } });
    
    // Switch to Select tool
    await page.click('[data-testid="tool-select"]');
    
    // Rapidly click between pontoons and empty space
    for (let i = 0; i < 10; i++) {
      await canvas.click({ position: { x: 960, y: 540 } });
      await canvas.click({ position: { x: 800, y: 400 } }); // empty space
      await page.keyboard.down('Control');
      await canvas.click({ position: { x: 990, y: 540 } });
      await page.keyboard.up('Control');
    }
    
    // Should still be functional
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Tool: select');
    
    // Final click should work
    await canvas.click({ position: { x: 1020, y: 540 } });
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: Selected:');
    });
  });

  test('should handle selection on different levels', async ({ page }) => {
    // Place pontoons on level 0
    await page.click('[data-testid="tool-place"]');
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 960, y: 540 } });
    
    // Switch to level 1
    await page.click('[data-testid="level-1"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Level: 1');
    });
    
    // Place pontoon on level 1 (should fail due to no support)
    await canvas.click({ position: { x: 960, y: 540 } });
    
    // Switch back to level 0
    await page.click('[data-testid="level-0"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Level: 0');
    });
    
    // Switch to Select tool
    await page.click('[data-testid="tool-select"]');
    
    // Should be able to select pontoon on level 0
    await canvas.click({ position: { x: 960, y: 540 } });
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Selected-Pontoons: 1');
    });
    
    // Switch to level 1 (selection should be cleared since pontoon is on level 0)
    await page.click('[data-testid="level-1"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Level: 1');
    });
    
    // Click on same position (should not select anything as pontoon is on level 0)
    await canvas.click({ position: { x: 960, y: 540 } });
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: Selection cleared');
    });
  });

});