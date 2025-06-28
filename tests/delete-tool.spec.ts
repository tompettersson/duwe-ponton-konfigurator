import { test, expect } from '@playwright/test';

test.describe('Delete Tool Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-new-architecture');
    
    // Wait for the page to load and the debug panel to appear
    await page.waitForSelector('[data-testid="debug-panel"]');
    await page.waitForTimeout(1000); // Let the 3D scene initialize
  });

  test('Should place pontoon and then delete it at same position', async ({ page }) => {
    console.log('🧪 Test: Place pontoon and delete at same position');
    
    // Get canvas position for consistent clicking
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    
    if (!canvasBox) {
      throw new Error('Canvas not found');
    }
    
    // Define a specific position to click (center of canvas)
    const clickX = canvasBox.width / 2;
    const clickY = canvasBox.height / 2;
    
    console.log(`🧪 Canvas size: ${canvasBox.width}x${canvasBox.height}`);
    console.log(`🧪 Click position: (${clickX}, ${clickY})`);
    
    // Step 1: Ensure PLACE tool is selected
    await page.click('[data-testid="tool-place"]');
    console.log('🧪 Selected PLACE tool');
    
    // Step 2: Get initial pontoon count
    const initialCountText = await page.locator('[data-testid="pontoon-count"]').textContent();
    const initialCount = parseInt(initialCountText || '0');
    console.log(`🧪 Initial pontoon count: ${initialCount}`);
    
    // Step 3: Place pontoon by clicking on canvas
    await canvas.click({ position: { x: clickX, y: clickY } });
    console.log('🧪 Clicked canvas to place pontoon');
    
    // Step 4: Wait for placement and verify success
    await page.waitForTimeout(500);
    const placementResult = await page.locator('[data-testid="debug-panel"]').locator('text=Last-Click:').textContent();
    console.log(`🧪 Placement result: ${placementResult}`);
    
    expect(placementResult).toContain('SUCCESS');
    
    // Step 5: Verify pontoon count increased
    const afterPlaceCountText = await page.locator('[data-testid="pontoon-count"]').textContent();
    const afterPlaceCount = parseInt(afterPlaceCountText || '0');
    console.log(`🧪 Pontoon count after placement: ${afterPlaceCount}`);
    
    expect(afterPlaceCount).toBe(initialCount + 1);
    
    // Step 6: Switch to DELETE tool
    await page.click('[data-testid="tool-delete"]');
    console.log('🧪 Selected DELETE tool');
    
    // Step 7: Click EXACTLY the same position to delete
    await canvas.click({ position: { x: clickX, y: clickY } });
    console.log('🧪 Clicked same position to delete pontoon');
    
    // Step 8: Wait for deletion and verify success
    await page.waitForTimeout(500);
    const deletionResult = await page.locator('[data-testid="debug-panel"]').locator('text=Last-Click:').textContent();
    console.log(`🧪 Deletion result: ${deletionResult}`);
    
    expect(deletionResult).toContain('SUCCESS');
    
    // Step 9: Verify pontoon count decreased back to original
    const finalCountText = await page.locator('[data-testid="pontoon-count"]').textContent();
    const finalCount = parseInt(finalCountText || '0');
    console.log(`🧪 Final pontoon count: ${finalCount}`);
    
    expect(finalCount).toBe(initialCount);
    
    console.log('🧪 ✅ Test completed successfully: Place and delete at same position');
  });

  test('Should fail to delete when no pontoon exists', async ({ page }) => {
    console.log('🧪 Test: Delete attempt on empty position');
    
    // Get canvas position
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    
    if (!canvasBox) {
      throw new Error('Canvas not found');
    }
    
    // Click on a corner position (likely empty)
    const clickX = canvasBox.width * 0.1;
    const clickY = canvasBox.height * 0.1;
    
    // Select DELETE tool
    await page.click('[data-testid="tool-delete"]');
    console.log('🧪 Selected DELETE tool');
    
    // Try to delete at empty position
    await canvas.click({ position: { x: clickX, y: clickY } });
    console.log('🧪 Clicked empty position');
    
    // Wait and check result
    await page.waitForTimeout(500);
    const deletionResult = await page.locator('[data-testid="debug-panel"]').locator('text=Last-Click:').textContent();
    console.log(`🧪 Deletion result: ${deletionResult}`);
    
    expect(deletionResult).toContain('FAILED: No pontoon at position');
    
    console.log('🧪 ✅ Test completed successfully: Delete empty position fails correctly');
  });

  test('Should handle multiple place-delete cycles', async ({ page }) => {
    console.log('🧪 Test: Multiple place-delete cycles');
    
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    
    if (!canvasBox) {
      throw new Error('Canvas not found');
    }
    
    // Define different positions for multiple pontoons
    const positions = [
      { x: canvasBox.width * 0.3, y: canvasBox.height * 0.3 },
      { x: canvasBox.width * 0.7, y: canvasBox.height * 0.3 },
      { x: canvasBox.width * 0.5, y: canvasBox.height * 0.7 }
    ];
    
    // Get initial count
    const initialCountText = await page.locator('[data-testid="pontoon-count"]').textContent();
    const initialCount = parseInt(initialCountText || '0');
    
    for (let i = 0; i < positions.length; i++) {
      console.log(`🧪 Cycle ${i + 1}: Placing pontoon at position ${i}`);
      
      // Place pontoon
      await page.click('[data-testid="tool-place"]');
      await canvas.click({ position: positions[i] });
      await page.waitForTimeout(300);
      
      // Verify placement
      const placeResult = await page.locator('[data-testid="debug-panel"]').locator('text=Last-Click:').textContent();
      expect(placeResult).toContain('SUCCESS');
      
      // Delete pontoon
      await page.click('[data-testid="tool-delete"]');
      await canvas.click({ position: positions[i] });
      await page.waitForTimeout(300);
      
      // Verify deletion
      const deleteResult = await page.locator('[data-testid="debug-panel"]').locator('text=Last-Click:').textContent();
      expect(deleteResult).toContain('SUCCESS');
    }
    
    // Verify final count is back to initial
    const finalCountText = await page.locator('[data-testid="pontoon-count"]').textContent();
    const finalCount = parseInt(finalCountText || '0');
    
    expect(finalCount).toBe(initialCount);
    
    console.log('🧪 ✅ Test completed successfully: Multiple place-delete cycles');
  });
});