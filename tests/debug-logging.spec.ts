import { test, expect } from '@playwright/test';

test.describe('Debug Logging Test', () => {
  test('Test drag with detailed console logging', async ({ page }) => {
    await page.goto('http://localhost:3001/test-new-architecture');
    
    // Capture console logs
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('🎯')) {
        consoleMessages.push(msg.text());
        console.log('CONSOLE:', msg.text());
      }
    });
    
    // Wait for page to load
    await expect(page.locator('[data-testid="debug-panel"]')).toBeVisible();
    
    // Select Multi-Drop tool
    await page.locator('[data-testid="tool-multi-drop"]').click();
    
    // Perform a clear drag operation
    console.log('=== STARTING DRAG TEST ===');
    await page.mouse.move(400, 400);
    await page.mouse.down();
    await page.mouse.move(450, 450); // 50px diagonal
    await page.mouse.up();
    
    // Wait for all processing
    await page.waitForTimeout(1000);
    
    // Print final state
    console.log('Final pontoon count:', await page.locator('[data-testid="pontoon-count"]').textContent());
    console.log('Final debug panel:', await page.locator('[data-testid="debug-panel"]').textContent());
    
    // Print all console messages
    console.log('=== ALL CONSOLE MESSAGES ===');
    consoleMessages.forEach((msg, index) => {
      console.log(`${index + 1}: ${msg}`);
    });
  });
});