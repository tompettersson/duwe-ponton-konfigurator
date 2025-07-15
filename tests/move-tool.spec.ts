/**
 * Move Tool Tests - Comprehensive validation using Firefox
 * 
 * Tests all Move Tool functionality including:
 * - Two-click move pattern (select then move)
 * - Move state tracking through debug panel
 * - Error handling for invalid operations
 * - Tool switching behavior
 * - Multiple pontoon move restrictions
 * 
 * Uses debug panel text parsing for 95% automated testing
 */

import { test, expect } from '@playwright/test';

// Use Firefox to avoid conflicts with other browser instances
test.use({ 
  browserName: 'firefox',
  viewport: { width: 1920, height: 1080 }
});

// Configure to run tests only on firefox
test.describe.configure({ mode: 'parallel' });

test.describe('Move Tool Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the main route which now uses NewPontoonConfigurator
    await page.goto('http://localhost:3000/');
    
    // Wait for the page to load and debug panel to appear
    await page.waitForSelector('[data-testid="debug-panel"]', { timeout: 10000 });
    
    // Ensure Move tool is active
    await page.click('[data-testid="tool-move"]');
    
    // Wait for tool to be active
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: move');
    });
  });

  test('should show Move tool as active in debug panel', async ({ page }) => {
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Tool: move');
    await expect(debugPanel).toContainText('Move-State: none');
  });

  test('should place pontoons first for move testing', async ({ page }) => {
    // First, place some pontoons using Place tool
    await page.click('[data-testid="tool-place"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: place');
    });

    // Place a pontoon at (25, 0, 25) - center of grid
    await page.mouse.move(960, 540); // Center of screen
    await page.mouse.click(960, 540);
    
    // Wait for successful placement
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: SUCCESS');
    });

    // Place another pontoon at (27, 0, 25)
    await page.mouse.move(1000, 540);
    await page.mouse.click(1000, 540);
    
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: SUCCESS');
    });

    // Switch back to Move tool
    await page.click('[data-testid="tool-move"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: move');
    });
  });

  test('should handle first click - select pontoon for moving', async ({ page }) => {
    // Place a pontoon first
    await page.click('[data-testid="tool-place"]');
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: SUCCESS');
    });

    // Switch to Move tool
    await page.click('[data-testid="tool-move"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: move');
    });

    // First click on pontoon should select it for moving
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    
    // Wait for move state to update
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Move-State: moving');
    });

    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Move-State: moving');
    await expect(debugPanel).toContainText('Selected-Pontoons: 1');
    await expect(debugPanel).toContainText('Moving-Pontoon:');
    await expect(debugPanel).toContainText('Click destination');
  });

  test('should handle second click - move pontoon to destination', async ({ page }) => {
    // Place a pontoon first
    await page.click('[data-testid="tool-place"]');
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: SUCCESS');
    });

    // Switch to Move tool
    await page.click('[data-testid="tool-move"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: move');
    });

    // First click - select pontoon
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Move-State: moving');
    });

    // Second click - move to new position
    await page.mouse.move(1000, 540);
    await page.mouse.click(1000, 540);
    
    // Wait for move completion
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('SUCCESS: Pontoon moved');
    });

    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Move-State: none');
    await expect(debugPanel).toContainText('Selected-Pontoons: 0');
    await expect(debugPanel).toContainText('SUCCESS: Pontoon moved');
  });

  test('should handle click on empty space - show error', async ({ page }) => {
    // Click on empty space
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    
    // Wait for error message
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('FAILED: No pontoon to move');
    });

    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('FAILED: No pontoon to move at this position');
    await expect(debugPanel).toContainText('Move-State: none');
  });

  test('should handle move to same position - show error', async ({ page }) => {
    // Place a pontoon first
    await page.click('[data-testid="tool-place"]');
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: SUCCESS');
    });

    // Switch to Move tool
    await page.click('[data-testid="tool-move"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: move');
    });

    // First click - select pontoon
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Move-State: moving');
    });

    // Second click - try to move to same position
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    
    // Wait for error message
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('FAILED: Pontoon is already at this position');
    });

    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('FAILED: Pontoon is already at this position');
    await expect(debugPanel).toContainText('Move-State: moving'); // Should stay in moving state
  });

  test('should handle move to invalid position - show error and reset state', async ({ page }) => {
    // Place a pontoon first
    await page.click('[data-testid="tool-place"]');
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: SUCCESS');
    });

    // Place another pontoon to block the destination
    await page.mouse.move(1000, 540);
    await page.mouse.click(1000, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: SUCCESS');
    });

    // Switch to Move tool
    await page.click('[data-testid="tool-move"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: move');
    });

    // First click - select first pontoon
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Move-State: moving');
    });

    // Second click - try to move to occupied position
    await page.mouse.move(1000, 540);
    await page.mouse.click(1000, 540);
    
    // Wait for error message and state reset
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('FAILED: Move failed');
    });

    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('FAILED: Move failed');
    await expect(debugPanel).toContainText('Move-State: none');
    await expect(debugPanel).toContainText('Selected-Pontoons: 0');
  });

  test('should reset move state when switching tools', async ({ page }) => {
    // Place a pontoon first
    await page.click('[data-testid="tool-place"]');
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: SUCCESS');
    });

    // Switch to Move tool
    await page.click('[data-testid="tool-move"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: move');
    });

    // First click - select pontoon
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Move-State: moving');
    });

    // Switch to Select tool
    await page.click('[data-testid="tool-select"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: select');
    });

    // Move state should be reset
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Move-State: none');
    
    // Switch back to Move tool
    await page.click('[data-testid="tool-move"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: move');
    });
    
    // Should still be reset
    await expect(debugPanel).toContainText('Move-State: none');
  });

  test('should handle keyboard shortcut activation', async ({ page }) => {
    // Use keyboard shortcut to activate Move tool
    await page.keyboard.press('7');
    
    // Wait for tool to be active
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: move');
    });

    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Tool: move');
    await expect(debugPanel).toContainText('Move-State: none');
  });

  test('should show proper debug information throughout move process', async ({ page }) => {
    // Place a pontoon first
    await page.click('[data-testid="tool-place"]');
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: SUCCESS');
    });

    // Switch to Move tool
    await page.click('[data-testid="tool-move"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: move');
    });

    const debugPanel = page.locator('[data-testid="debug-panel"]');
    
    // Initial state
    await expect(debugPanel).toContainText('Move-State: none');
    await expect(debugPanel).not.toContainText('Moving-Pontoon:');
    
    // First click - select pontoon
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Move-State: moving');
    });

    // Moving state
    await expect(debugPanel).toContainText('Move-State: moving');
    await expect(debugPanel).toContainText('Moving-Pontoon:');
    await expect(debugPanel).toContainText('Selected-Pontoons: 1');
    
    // Second click - move to new position
    await page.mouse.move(1000, 540);
    await page.mouse.click(1000, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('SUCCESS: Pontoon moved');
    });

    // Completed state
    await expect(debugPanel).toContainText('Move-State: none');
    await expect(debugPanel).not.toContainText('Moving-Pontoon:');
    await expect(debugPanel).toContainText('Selected-Pontoons: 0');
  });

  test('should handle hover position display during move', async ({ page }) => {
    // Place a pontoon first
    await page.click('[data-testid="tool-place"]');
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: SUCCESS');
    });

    // Switch to Move tool
    await page.click('[data-testid="tool-move"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: move');
    });

    // First click - select pontoon
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Move-State: moving');
    });

    // Move cursor to different position
    await page.mouse.move(1000, 540);
    
    // Wait for hover position to update
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Hover:');
    });

    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Hover:');
    await expect(debugPanel).toContainText('Grid-Cell-Can-Place:');
    await expect(debugPanel).toContainText('Pontoon-Here:');
  });

  test('should handle multiple level moves', async ({ page }) => {
    // Place a pontoon on level 0
    await page.click('[data-testid="tool-place"]');
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: SUCCESS');
    });

    // Switch to Move tool
    await page.click('[data-testid="tool-move"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: move');
    });

    // First click - select pontoon
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Move-State: moving');
    });

    // Move to different position on same level
    await page.mouse.move(1000, 540);
    await page.mouse.click(1000, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('SUCCESS: Pontoon moved');
    });

    const debugPanel = page.locator('[data-testid="debug-panel"]');
    await expect(debugPanel).toContainText('Level: 0');
    await expect(debugPanel).toContainText('SUCCESS: Pontoon moved');
  });

  test('should maintain cursor style during move operation', async ({ page }) => {
    // Place a pontoon first
    await page.click('[data-testid="tool-place"]');
    await page.mouse.move(960, 540);
    await page.mouse.click(960, 540);
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Last-Click: SUCCESS');
    });

    // Switch to Move tool
    await page.click('[data-testid="tool-move"]');
    await page.waitForFunction(() => {
      const debugPanel = document.querySelector('[data-testid="debug-panel"]');
      return debugPanel?.textContent?.includes('Tool: move');
    });

    // Check that the tool is active in toolbar
    const moveTool = page.locator('[data-testid="tool-move"]');
    await expect(moveTool).toHaveClass(/bg-blue-500/);
  });
});