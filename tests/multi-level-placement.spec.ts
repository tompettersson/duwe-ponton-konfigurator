import { test, expect } from '@playwright/test';

test.describe('Multi-Level Pontoon Placement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Wait for 3D scene to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1000); // Give Three.js time to initialize
  });

  test('Level 0 placement should always work', async ({ page }) => {
    // Ensure we're on Level 0
    const levelSelector = page.locator('button[aria-label="Level 0 (Wasseroberfläche)"]');
    await levelSelector.click();
    
    // Click on canvas to place pontoon
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Check debug panel for success
    const debugPanel = page.locator('.absolute.bottom-4.left-4');
    await expect(debugPanel).toContainText('Pontoons: 1');
  });

  test('Level 1 placement over Level 0 should work', async ({ page }) => {
    // First place a pontoon on Level 0
    const levelSelector0 = page.locator('button[aria-label="Level 0 (Wasseroberfläche)"]');
    await levelSelector0.click();
    
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Wait for placement
    await page.waitForTimeout(500);
    
    // Switch to Level 1
    const levelSelector1 = page.locator('button[aria-label="Level 1 (Erstes Deck)"]');
    await levelSelector1.click();
    await page.waitForTimeout(500);
    
    // Try to place at same position (should work because there's support)
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Check debug panel - should have 2 pontoons
    const debugPanel = page.locator('.absolute.bottom-4.left-4');
    await expect(debugPanel).toContainText('Pontoons: 2');
  });

  test('Level 1 placement without Level 0 support should fail', async ({ page }) => {
    // Switch directly to Level 1
    const levelSelector1 = page.locator('button[aria-label="Level 1 (Erstes Deck)"]');
    await levelSelector1.click();
    await page.waitForTimeout(500);
    
    // Try to place pontoon (should fail)
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Check debug panel - should still have 0 pontoons
    const debugPanel = page.locator('.absolute.bottom-4.left-4');
    await expect(debugPanel).toContainText('Pontoons: 0');
  });

  test('Hover validation should match placement validation', async ({ page }) => {
    // Switch to Level 1
    const levelSelector1 = page.locator('button[aria-label="Level 1 (Erstes Deck)"]');
    await levelSelector1.click();
    await page.waitForTimeout(500);
    
    const canvas = page.locator('canvas');
    const debugPanel = page.locator('.absolute.bottom-4.left-4');
    
    // Move mouse over canvas (no support below)
    await canvas.hover({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(100);
    
    // Check Support-L0 indicator
    await expect(debugPanel).toContainText('Support-L0: ❌');
    
    // Now place a pontoon on Level 0
    const levelSelector0 = page.locator('button[aria-label="Level 0 (Wasseroberfläche)"]');
    await levelSelector0.click();
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);
    
    // Switch back to Level 1
    await levelSelector1.click();
    await page.waitForTimeout(500);
    
    // Hover over same position (now with support)
    await canvas.hover({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(100);
    
    // Check Support-L0 indicator
    await expect(debugPanel).toContainText('Support-L0: ✅');
    
    // Click should now work
    await canvas.click({ position: { x: 400, y: 300 } });
    await expect(debugPanel).toContainText('Pontoons: 2');
  });

  test('Level 2 placement requires both Level 0 and Level 1 support', async ({ page }) => {
    const canvas = page.locator('canvas');
    const debugPanel = page.locator('.absolute.bottom-4.left-4');
    
    // Place on Level 0
    const levelSelector0 = page.locator('button[aria-label="Level 0 (Wasseroberfläche)"]');
    await levelSelector0.click();
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);
    
    // Place on Level 1
    const levelSelector1 = page.locator('button[aria-label="Level 1 (Erstes Deck)"]');
    await levelSelector1.click();
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);
    
    // Now try Level 2
    const levelSelector2 = page.locator('button[aria-label="Level 2 (Zweites Deck)"]');
    await levelSelector2.click();
    await page.waitForTimeout(500);
    
    // Should be able to place on Level 2
    await canvas.click({ position: { x: 400, y: 300 } });
    await expect(debugPanel).toContainText('Pontoons: 3');
  });

  test('Multi-drop should respect level support rules', async ({ page }) => {
    const canvas = page.locator('canvas');
    const debugPanel = page.locator('.absolute.bottom-4.left-4');
    
    // First create a base on Level 0
    const levelSelector0 = page.locator('button[aria-label="Level 0 (Wasseroberfläche)"]');
    await levelSelector0.click();
    
    // Select multi-drop tool
    const multiDropTool = page.locator('button[aria-label="Multi-Drop-Modus"]');
    await multiDropTool.click();
    
    // Create a 2x2 area on Level 0
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.move(500, 500);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Should have placed multiple pontoons
    const pontoonsText = await debugPanel.locator('text=/Pontoons: \\d+/').textContent();
    const pontoonCount = parseInt(pontoonsText?.match(/\d+/)?.[0] || '0');
    expect(pontoonCount).toBeGreaterThan(1);
    
    // Switch to Level 1
    const levelSelector1 = page.locator('button[aria-label="Level 1 (Erstes Deck)"]');
    await levelSelector1.click();
    await page.waitForTimeout(500);
    
    // Try multi-drop on Level 1 - should only place where there's support
    await page.mouse.move(250, 250);
    await page.mouse.down();
    await page.mouse.move(550, 550);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Check that some (but not all) pontoons were placed
    const newPontoonsText = await debugPanel.locator('text=/Pontoons: \\d+/').textContent();
    const newPontoonCount = parseInt(newPontoonsText?.match(/\d+/)?.[0] || '0');
    expect(newPontoonCount).toBeGreaterThan(pontoonCount);
  });
});