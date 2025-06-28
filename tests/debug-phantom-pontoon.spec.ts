import { test, expect } from '@playwright/test';

test.describe('Debug Phantom Pontoon Issue', () => {
  test('Investigate phantom pontoon and pink rendering on delete', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('🎨')) {
        console.log('BROWSER:', msg.text());
      }
    });
    
    page.on('pageerror', err => {
      console.error('PAGE ERROR:', err);
    });

    await page.goto('/test-new-architecture');
    await page.waitForSelector('[data-testid="debug-panel"]');
    await page.waitForTimeout(1000); // Let the 3D scene initialize
    
    console.log('🧪 Test: Debugging phantom pontoon issue');
    
    // Step 1: Place 3 pontoons
    console.log('🧪 Step 1: Placing 3 pontoons');
    await page.click('[data-testid="tool-place"]');
    
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    
    // Place pontoons at different positions
    const positions = [
      { x: canvasBox.width * 0.4, y: canvasBox.height * 0.4 },
      { x: canvasBox.width * 0.6, y: canvasBox.height * 0.4 },
      { x: canvasBox.width * 0.5, y: canvasBox.height * 0.6 }
    ];
    
    for (let i = 0; i < positions.length; i++) {
      await canvas.click({ position: positions[i] });
      await page.waitForTimeout(500);
      console.log(`🧪 Placed pontoon ${i + 1} at (${positions[i].x}, ${positions[i].y})`);
    }
    
    // Step 2: Check initial console output
    console.log('🧪 Step 2: Checking console logs before deletion');
    await page.waitForTimeout(1000);
    
    // Step 3: Switch to delete tool
    console.log('🧪 Step 3: Switching to delete tool');
    await page.click('[data-testid="tool-delete"]');
    await page.waitForTimeout(500);
    
    // Step 4: Delete middle pontoon
    console.log('🧪 Step 4: Deleting middle pontoon');
    await canvas.click({ position: positions[1] });
    await page.waitForTimeout(1000);
    
    // Step 5: Check for visual issues
    console.log('🧪 Step 5: Checking for pink/magenta coloring');
    
    // Take screenshot to check for pink coloring
    await page.screenshot({ 
      path: 'test-results/phantom-pontoon-after-delete.png',
      fullPage: false 
    });
    
    // Step 6: Get pontoon count from debug panel
    const pontoonCountText = await page.locator('[data-testid="pontoon-count"]').textContent();
    console.log(`🧪 Pontoon count after deletion: ${pontoonCountText}`);
    
    // Step 7: Check if we can interact with phantom pontoon
    console.log('🧪 Step 7: Trying to click upper right corner for phantom pontoon');
    
    // Try clicking in upper right area where phantom might appear
    await canvas.click({ position: { 
      x: canvasBox.width * 0.9, 
      y: canvasBox.height * 0.1 
    }});
    await page.waitForTimeout(500);
    
    const lastClickResult = await page.locator('[data-testid="debug-panel"]').locator('text=Last-Click:').textContent();
    console.log(`🧪 Click result in upper right: ${lastClickResult}`);
    
    // Step 8: Get final diagnostic info
    console.log('🧪 Step 8: Final diagnostics');
    
    // Check if Three.js errors are present
    const errorTexts = await page.evaluate(() => {
      const errors = [];
      // Check for Three.js warnings in console
      const consoleMessages = (window as any).__consoleMessages || [];
      consoleMessages.forEach((msg: any) => {
        if (msg.includes('THREE') || msg.includes('WebGL')) {
          errors.push(msg);
        }
      });
      return errors;
    });
    
    if (errorTexts.length > 0) {
      console.log('🧪 Three.js/WebGL errors found:', errorTexts);
    }
    
    // Final check
    console.log('🧪 Test completed - check screenshot at test-results/phantom-pontoon-after-delete.png');
  });

  test('Isolate delete operation with console capture', async ({ page }) => {
    // Capture ALL console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (text.includes('🎨') || text.includes('PHANTOM') || text.includes('Error') || text.includes('THREE')) {
        console.log(`[${msg.type()}] ${text}`);
      }
    });
    
    await page.goto('/test-new-architecture');
    await page.waitForSelector('[data-testid="debug-panel"]');
    await page.waitForTimeout(1000);
    
    console.log('🧪 Test: Isolating delete operation');
    
    // Place single pontoon
    await page.click('[data-testid="tool-place"]');
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    
    await canvas.click({ position: { 
      x: canvasBox.width / 2, 
      y: canvasBox.height / 2 
    }});
    await page.waitForTimeout(500);
    
    // Clear console messages before delete
    consoleMessages.length = 0;
    
    // Delete it
    await page.click('[data-testid="tool-delete"]');
    await canvas.click({ position: { 
      x: canvasBox.width / 2, 
      y: canvasBox.height / 2 
    }});
    await page.waitForTimeout(1000);
    
    // Analyze console output
    console.log('🧪 Console messages after delete:');
    consoleMessages.forEach(msg => {
      if (msg.includes('Rendering pontoons:') || 
          msg.includes('PHANTOM') || 
          msg.includes('position') ||
          msg.includes('error') ||
          msg.includes('Invalid')) {
        console.log('  -', msg);
      }
    });
    
    // Check for specific phantom pontoon indicators
    const phantomMessages = consoleMessages.filter(msg => 
      msg.includes('PHANTOM PONTOON DETECTED')
    );
    
    if (phantomMessages.length > 0) {
      console.log('🧪 ⚠️ PHANTOM PONTOONS FOUND:', phantomMessages);
    } else {
      console.log('🧪 ✅ No phantom pontoons detected in console');
    }
  });
});