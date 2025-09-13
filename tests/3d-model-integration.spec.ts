/**
 * 3D Model Integration Tests
 * 
 * Tests the loading and analysis of 3D pontoon models
 * Captures dimensions and verifies proper scaling
 */

import { test, expect } from '@playwright/test';

// Disable webServer for this test since server is already running
test.use({ 
  baseURL: 'http://localhost:3002',
});

test.describe('3D Model Integration', () => {
  
  test('Load and analyze double pontoon model', async ({ page }) => {
    // Navigate to 3D model test page
    await page.goto('http://localhost:3002/test-3d-model');
    
    // Wait for model to load
    await page.waitForTimeout(3000);
    
    // Get the info text
    const infoElement = await page.locator('pre');
    const infoText = await infoElement.textContent();
    
    console.log('=== 3D MODEL ANALYSIS ===');
    console.log(infoText);
    
    // Take screenshot for visual verification
    await page.screenshot({ 
      path: 'tests/screenshots/3d-model-loaded.png',
      fullPage: true 
    });
    
    // Verify model loaded successfully
    expect(infoText).not.toContain('Loading...');
    expect(infoText).not.toContain('Error');
    
    // Extract dimensions using regex
    const dimensionsMatch = infoText?.match(/Dimensions: (\d+)mm x (\d+)mm x (\d+)mm/);
    if (dimensionsMatch) {
      const width = parseInt(dimensionsMatch[1]);
      const height = parseInt(dimensionsMatch[2]);
      const depth = parseInt(dimensionsMatch[3]);
      
      console.log(`\nExtracted dimensions:`);
      console.log(`- Width: ${width}mm`);
      console.log(`- Height: ${height}mm`);
      console.log(`- Depth: ${depth}mm`);
      
      // Verify dimensions are reasonable for a double pontoon
      expect(width).toBeGreaterThan(800); // Should be close to 1000mm
      expect(width).toBeLessThan(1200);
      expect(height).toBeGreaterThan(300); // Should be close to 400mm
      expect(height).toBeLessThan(500);
    }
    
    // Extract scale factor
    const scaleMatch = infoText?.match(/Scale Factor: ([\d.]+)/);
    if (scaleMatch) {
      const scaleFactor = parseFloat(scaleMatch[1]);
      console.log(`\nScale Factor: ${scaleFactor}`);
      
      // Scale factor should be reasonable (not too small or large)
      expect(scaleFactor).toBeGreaterThan(0.5);
      expect(scaleFactor).toBeLessThan(2.0);
    }
  });
  
  test('Test 3D model in main configurator', async ({ page }) => {
    // Navigate to new architecture page
    await page.goto('http://localhost:3002/test-new-architecture');
    
    // Wait for page to load
    await page.waitForTimeout(1000);
    
    // Click the 3D Model Test button
    await page.click('button:has-text("🧊 3D Modell Test")');
    
    // Wait for alert
    page.on('dialog', async dialog => {
      const message = dialog.message();
      console.log('\n=== ALERT MESSAGE ===');
      console.log(message);
      
      // Check if dimensions are in the alert
      expect(message).toContain('3D Modell geladen!');
      expect(message).toContain('Dimensionen:');
      
      await dialog.accept();
    });
    
    // Wait a bit for the model to load
    await page.waitForTimeout(2000);
    
    // Check console for detailed logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('Double Pontoon') || msg.text().includes('Scale')) {
        consoleLogs.push(msg.text());
      }
    });
    
    // Give time for console logs
    await page.waitForTimeout(1000);
    
    if (consoleLogs.length > 0) {
      console.log('\n=== CONSOLE LOGS ===');
      consoleLogs.forEach(log => console.log(log));
    }
  });
});