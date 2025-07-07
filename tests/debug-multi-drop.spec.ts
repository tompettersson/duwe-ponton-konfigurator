import { test, expect } from '@playwright/test';

test.describe('Debug Multi-Drop Tool', () => {
  test('Debug Multi-Drop functionality step by step', async ({ page }) => {
    await page.goto('http://localhost:3001/test-new-architecture');
    
    // Wait for page to load
    await expect(page.locator('[data-testid="debug-panel"]')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    
    // Check initial state
    console.log('1. Initial pontoon count:', await page.locator('[data-testid="pontoon-count"]').textContent());
    console.log('2. Initial tool:', await page.locator('[data-testid="debug-panel"]').textContent());
    
    // Click Multi-Drop tool
    const multiDropButton = page.locator('[data-testid="tool-multi-drop"]');
    await expect(multiDropButton).toBeVisible();
    await multiDropButton.click();
    
    console.log('3. After tool click:', await page.locator('[data-testid="debug-panel"]').textContent());
    
    // Check if tool changed
    const debugText = await page.locator('[data-testid="debug-panel"]').textContent();
    if (!debugText?.includes('Tool: multi-drop')) {
      console.log('ERROR: Tool did not change to multi-drop');
      // Try keyboard shortcut instead
      await page.keyboard.press('5');
      console.log('4. After keyboard shortcut:', await page.locator('[data-testid="debug-panel"]').textContent());
    }
    
    // Try a very simple drag operation
    const canvas = page.locator('canvas');
    const boundingBox = await canvas.boundingBox();
    if (!boundingBox) {
      throw new Error('Canvas not found');
    }
    
    console.log('5. Canvas dimensions:', boundingBox);
    
    // Use center area of canvas
    const centerX = boundingBox.x + boundingBox.width / 2;
    const centerY = boundingBox.y + boundingBox.height / 2;
    
    console.log('6. Drag center point:', { centerX, centerY });
    
    // Start drag
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    console.log('7. Mouse down at center');
    
    // Move to create drag
    await page.mouse.move(centerX + 50, centerY + 50);
    console.log('8. Mouse moved to create drag');
    
    // Wait a bit to see if drag state changes
    await page.waitForTimeout(200);
    console.log('9. Debug panel during drag:', await page.locator('[data-testid="debug-panel"]').textContent());
    
    // End drag
    await page.mouse.up();
    console.log('10. Mouse up');
    
    // Wait for processing
    await page.waitForTimeout(1000);
    
    // Check final state
    console.log('11. Final pontoon count:', await page.locator('[data-testid="pontoon-count"]').textContent());
    console.log('12. Final debug panel:', await page.locator('[data-testid="debug-panel"]').textContent());
  });
});