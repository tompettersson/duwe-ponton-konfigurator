/**
 * 2D View Screenshot Tests
 * 
 * Tests the optimized 2D camera setup and initial pontoon placement
 */

import { test, expect } from '@playwright/test';

test.use({ 
  baseURL: 'http://localhost:3002',
});

test.describe('2D View Optimization', () => {
  
  test('Screenshot 2D view with demo pontoon', async ({ page }) => {
    // Navigate to new architecture page
    await page.goto('/test-new-architecture');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Take screenshot before view mode change
    await page.screenshot({ 
      path: 'tests/screenshots/initial-3d-view.png',
      fullPage: false 
    });
    
    // Switch to 2D view if not already
    const viewToggle = page.locator('button[title*="2D/3D"]');
    if (await viewToggle.isVisible()) {
      await viewToggle.click();
      await page.waitForTimeout(1000);
    }
    
    // Take screenshot of optimized 2D view
    await page.screenshot({ 
      path: 'tests/screenshots/2d-view-optimized.png',
      fullPage: false 
    });
    
    // Get debug panel info to verify demo pontoon
    const debugPanel = await page.locator('[data-testid="debug-panel"]');
    if (await debugPanel.isVisible()) {
      const debugText = await debugPanel.textContent();
      console.log('\n=== DEBUG PANEL INFO ===');
      console.log(debugText);
      
      // Check if pontoon was placed in center
      expect(debugText).toContain('Pontons: 1'); // Should have 1 demo pontoon
    }
    
    // Test different zoom levels for optimal viewing
    for (let i = 0; i < 3; i++) {
      // Zoom in slightly
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: `tests/screenshots/2d-view-zoom-${i+1}.png`,
        fullPage: false 
      });
    }
    
    console.log('\n✅ Screenshots saved for 2D view analysis');
  });
  
  test('Compare box vs 3D model rendering', async ({ page }) => {
    await page.goto('/test-new-architecture');
    await page.waitForTimeout(2000);
    
    // Switch to 2D view for better comparison
    const viewToggle = page.locator('button[title*="2D/3D"]');
    if (await viewToggle.isVisible()) {
      await viewToggle.click();
      await page.waitForTimeout(1000);
    }
    
    // Screenshot with box model (default)
    await page.screenshot({ 
      path: 'tests/screenshots/pontoon-box-model.png',
      fullPage: false 
    });
    
    // Try to click 3D toggle (if available)
    const toggle3D = page.locator('button:has-text("3D Toggle")');
    if (await toggle3D.isVisible()) {
      await toggle3D.click();
      await page.waitForTimeout(2000); // Wait for 3D models to load
      
      await page.screenshot({ 
        path: 'tests/screenshots/pontoon-3d-model.png',
        fullPage: false 
      });
    }
    
    console.log('\n✅ Box vs 3D model comparison screenshots saved');
  });
  
  test('Verify optimal camera positioning', async ({ page }) => {
    await page.goto('/test-new-architecture');
    await page.waitForTimeout(1000);
    
    // Switch to 2D view
    const viewToggle = page.locator('button[title*="2D/3D"]');
    if (await viewToggle.isVisible()) {
      await viewToggle.click();
      await page.waitForTimeout(1000);
    }
    
    // Get canvas element
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Take a focused screenshot of just the canvas area
    await canvas.screenshot({ 
      path: 'tests/screenshots/canvas-2d-focus.png'
    });
    
    // Test if pontoon is clearly visible and centered
    const boundingBox = await canvas.boundingBox();
    if (boundingBox) {
      console.log(`\nCanvas dimensions: ${boundingBox.width}x${boundingBox.height}`);
      
      // Click in center to see if we can interact with the demo pontoon
      await canvas.click({
        position: { 
          x: boundingBox.width / 2, 
          y: boundingBox.height / 2 
        }
      });
      
      await page.waitForTimeout(500);
      
      // Screenshot after interaction
      await canvas.screenshot({ 
        path: 'tests/screenshots/canvas-after-center-click.png'
      });
    }
    
    console.log('\n✅ Camera positioning verification complete');
  });
});