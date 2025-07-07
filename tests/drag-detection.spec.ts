import { test, expect } from '@playwright/test';

test.describe('Drag Detection Debug', () => {
  test('Test drag detection with different distances', async ({ page }) => {
    await page.goto('http://localhost:3001/test-new-architecture');
    
    // Wait for page to load
    await expect(page.locator('[data-testid="debug-panel"]')).toBeVisible();
    
    // Select Multi-Drop tool
    await page.locator('[data-testid="tool-multi-drop"]').click();
    
    const canvas = page.locator('canvas');
    const boundingBox = await canvas.boundingBox();
    if (!boundingBox) throw new Error('Canvas not found');
    
    // Test 1: Very small drag (should be treated as click)
    console.log('=== Test 1: Small drag (2px) ===');
    await page.mouse.move(400, 400);
    await page.mouse.down();
    await page.mouse.move(402, 402); // 2px diagonal = ~2.8px distance
    await page.mouse.up();
    await page.waitForTimeout(200);
    console.log('Result:', await page.locator('[data-testid="debug-panel"]').textContent());
    
    // Clear any placed pontoons
    await page.locator('[data-testid="clear-grid"]').click();
    
    // Test 2: Medium drag (should trigger drag)
    console.log('=== Test 2: Medium drag (10px) ===');
    await page.mouse.move(400, 400);
    await page.mouse.down();
    await page.mouse.move(410, 410); // 10px diagonal = ~14px distance
    await page.mouse.up();
    await page.waitForTimeout(200);
    console.log('Result:', await page.locator('[data-testid="debug-panel"]').textContent());
    
    // Clear any placed pontoons
    await page.locator('[data-testid="clear-grid"]').click();
    
    // Test 3: Large drag (should definitely trigger drag)
    console.log('=== Test 3: Large drag (50px) ===');
    await page.mouse.move(400, 400);
    await page.mouse.down();
    await page.mouse.move(450, 450); // 50px diagonal = ~70px distance
    await page.mouse.up();
    await page.waitForTimeout(200);
    console.log('Result:', await page.locator('[data-testid="debug-panel"]').textContent());
    
    // Test 4: Very large horizontal drag
    console.log('=== Test 4: Large horizontal drag (100px) ===');
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.move(400, 300); // 100px horizontal
    await page.mouse.up();
    await page.waitForTimeout(200);
    console.log('Result:', await page.locator('[data-testid="debug-panel"]').textContent());
    
    // Final pontoon count
    console.log('Final pontoon count:', await page.locator('[data-testid="pontoon-count"]').textContent());
  });
});