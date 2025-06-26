/**
 * Architecture Comparison Tests
 * 
 * Direct comparison between old and new architecture
 * Proves that new architecture solves all identified problems
 */

import { test, expect } from '@playwright/test';

test.describe('Architecture Comparison - Old vs New', () => {
  
  test('Comparison: Click precision - Old vs New architecture', async ({ page }) => {
    console.log('🔄 Comparing click precision between architectures...');

    await page.goto('/');
    await page.waitForTimeout(2000);

    const results = {
      old: { successes: 0, failures: 0, avgTime: 0 },
      new: { successes: 0, failures: 0, avgTime: 0 }
    };

    // Test positions
    const testPositions = [
      { x: 0.3, y: 0.3 }, { x: 0.7, y: 0.3 },
      { x: 0.3, y: 0.7 }, { x: 0.7, y: 0.7 },
      { x: 0.5, y: 0.5 }
    ];

    // Test OLD architecture first
    console.log('Testing OLD architecture...');
    
    // Ensure we're in old architecture mode
    const oldModeButton = page.locator('text=Switch to Old');
    if (await oldModeButton.isVisible()) {
      await oldModeButton.click();
      await page.waitForTimeout(1000);
    }

    await page.click('[data-testid="tool-place"]', { timeout: 5000 });
    await page.click('[data-testid="level-0"]', { timeout: 5000 });

    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');

    for (const relPos of testPositions) {
      const position = {
        x: canvasBox.width * relPos.x,
        y: canvasBox.height * relPos.y
      };

      const startTime = Date.now();
      await canvas.click({ position });
      await page.waitForTimeout(300);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Check if placement succeeded
      const pontoonCountText = await page.locator('[data-testid="pontoon-count"]').textContent();
      const pontoonCount = parseInt(pontoonCountText || '0');
      
      if (pontoonCount > results.old.successes) {
        results.old.successes++;
        results.old.avgTime = (results.old.avgTime * (results.old.successes - 1) + responseTime) / results.old.successes;
      } else {
        results.old.failures++;
      }
    }

    console.log('OLD architecture results:', results.old);

    // Clear grid for new architecture test
    const clearButton = page.locator('[data-testid="clear-grid"]');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }

    // Test NEW architecture
    console.log('Testing NEW architecture...');
    
    const newModeButton = page.locator('text=Switch to New');
    if (await newModeButton.isVisible()) {
      await newModeButton.click();
      await page.waitForTimeout(1000);
    }

    await page.click('[data-testid="tool-place"]', { timeout: 5000 });
    await page.click('[data-testid="level-0"]', { timeout: 5000 });

    for (const relPos of testPositions) {
      const position = {
        x: canvasBox.width * relPos.x,
        y: canvasBox.height * relPos.y
      };

      const startTime = Date.now();
      await canvas.click({ position });
      await page.waitForTimeout(300);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Check if placement succeeded
      const pontoonCountText = await page.locator('[data-testid="pontoon-count"]').textContent();
      const pontoonCount = parseInt(pontoonCountText || '0');
      
      if (pontoonCount > results.new.successes) {
        results.new.successes++;
        results.new.avgTime = (results.new.avgTime * (results.new.successes - 1) + responseTime) / results.new.successes;
      } else {
        results.new.failures++;
      }
    }

    console.log('NEW architecture results:', results.new);

    // Assertions
    console.log('📊 COMPARISON RESULTS:');
    console.log(`OLD: ${results.old.successes}/${testPositions.length} success, ${results.old.avgTime.toFixed(0)}ms avg`);
    console.log(`NEW: ${results.new.successes}/${testPositions.length} success, ${results.new.avgTime.toFixed(0)}ms avg`);

    // New architecture should have better or equal success rate
    expect(results.new.successes).toBeGreaterThanOrEqual(results.old.successes);
    
    // New architecture should be faster or comparable
    if (results.new.successes > 0 && results.old.successes > 0) {
      expect(results.new.avgTime).toBeLessThanOrEqual(results.old.avgTime * 1.2); // Allow 20% tolerance
    }

    // New architecture should achieve 100% success rate
    expect(results.new.successes).toBe(testPositions.length);

    console.log('✅ New architecture shows improved click precision');
  });

  test('Comparison: Preview accuracy between architectures', async ({ page }) => {
    console.log('🔄 Comparing preview accuracy between architectures...');

    await page.goto('/');
    await page.waitForTimeout(2000);

    const testPreviewAccuracy = async (architectureName: string) => {
      console.log(`Testing ${architectureName} preview accuracy...`);
      
      await page.click('[data-testid="tool-place"]', { timeout: 5000 });
      await page.click('[data-testid="level-0"]', { timeout: 5000 });

      const canvas = page.locator('canvas').first();
      const canvasBox = await canvas.boundingBox();
      if (!canvasBox) throw new Error('Canvas not found');

      let mismatches = 0;
      let totalTests = 0;

      const testPositions = [
        { x: 0.25, y: 0.25 }, { x: 0.75, y: 0.25 },
        { x: 0.25, y: 0.75 }, { x: 0.75, y: 0.75 }
      ];

      for (const relPos of testPositions) {
        const position = {
          x: canvasBox.width * relPos.x,
          y: canvasBox.height * relPos.y
        };

        // Hover to trigger preview
        await canvas.hover({ position });
        await page.waitForTimeout(200);

        // Check preview state (if debug panel available)
        const debugPanel = page.locator('[data-testid="debug-panel"]');
        let previewSaysValid = false;
        
        if (await debugPanel.isVisible()) {
          const canPlaceText = await debugPanel.locator('text=Grid-Cell-Can-Place:').textContent();
          previewSaysValid = canPlaceText?.includes('✅') || false;
        } else {
          // If no debug panel, assume preview is shown (fallback)
          previewSaysValid = true;
        }

        // Click to test actual placement
        const pontoonCountBefore = await page.locator('[data-testid="pontoon-count"]').textContent();
        await canvas.click({ position });
        await page.waitForTimeout(300);

        const pontoonCountAfter = await page.locator('[data-testid="pontoon-count"]').textContent();
        const placementSucceeded = parseInt(pontoonCountAfter || '0') > parseInt(pontoonCountBefore || '0');

        totalTests++;
        if (previewSaysValid !== placementSucceeded) {
          mismatches++;
          console.log(`❌ Preview mismatch at ${relPos.x},${relPos.y}: preview=${previewSaysValid}, actual=${placementSucceeded}`);
        }
      }

      const accuracy = ((totalTests - mismatches) / totalTests) * 100;
      console.log(`${architectureName} preview accuracy: ${accuracy.toFixed(1)}% (${totalTests - mismatches}/${totalTests})`);
      
      return { accuracy, mismatches, totalTests };
    };

    // Test old architecture
    const oldModeButton = page.locator('text=Switch to Old');
    if (await oldModeButton.isVisible()) {
      await oldModeButton.click();
      await page.waitForTimeout(1000);
    }
    const oldResults = await testPreviewAccuracy('OLD');

    // Clear and test new architecture
    const clearButton = page.locator('[data-testid="clear-grid"]');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }

    const newModeButton = page.locator('text=Switch to New');
    if (await newModeButton.isVisible()) {
      await newModeButton.click();
      await page.waitForTimeout(1000);
    }
    const newResults = await testPreviewAccuracy('NEW');

    console.log('📊 PREVIEW ACCURACY COMPARISON:');
    console.log(`OLD: ${oldResults.accuracy.toFixed(1)}% accuracy`);
    console.log(`NEW: ${newResults.accuracy.toFixed(1)}% accuracy`);

    // New architecture should have better or equal preview accuracy
    expect(newResults.accuracy).toBeGreaterThanOrEqual(oldResults.accuracy);
    
    // New architecture should achieve near-perfect accuracy
    expect(newResults.accuracy).toBeGreaterThanOrEqual(90);

    console.log('✅ New architecture shows improved preview accuracy');
  });

  test('Comparison: Multi-level placement consistency', async ({ page }) => {
    console.log('🔄 Comparing multi-level placement between architectures...');

    const testMultiLevelPlacement = async (architectureName: string) => {
      console.log(`Testing ${architectureName} multi-level placement...`);

      await page.click('[data-testid="tool-place"]', { timeout: 5000 });
      
      const canvas = page.locator('canvas').first();
      const canvasBox = await canvas.boundingBox();
      if (!canvasBox) throw new Error('Canvas not found');

      const centerPos = { x: canvasBox.width / 2, y: canvasBox.height / 2 };
      let testsPassed = 0;
      let totalTests = 0;

      // Test 1: Place on Level 0 (should always work)
      totalTests++;
      await page.click('[data-testid="level-0"]', { timeout: 5000 });
      await canvas.click({ position: centerPos });
      await page.waitForTimeout(300);

      let pontoonCount = await page.locator('[data-testid="pontoon-count"]').textContent();
      if (parseInt(pontoonCount || '0') === 1) {
        testsPassed++;
        console.log(`✅ ${architectureName}: Level 0 placement succeeded`);
      } else {
        console.log(`❌ ${architectureName}: Level 0 placement failed`);
      }

      // Test 2: Place on Level 1 with support (should work)
      totalTests++;
      await page.click('[data-testid="level-1"]', { timeout: 5000 });
      await canvas.click({ position: centerPos });
      await page.waitForTimeout(300);

      pontoonCount = await page.locator('[data-testid="pontoon-count"]').textContent();
      if (parseInt(pontoonCount || '0') === 2) {
        testsPassed++;
        console.log(`✅ ${architectureName}: Level 1 with support succeeded`);
      } else {
        console.log(`❌ ${architectureName}: Level 1 with support failed`);
      }

      // Test 3: Try Level 1 without support (should fail)
      totalTests++;
      const noSupportPos = { x: centerPos.x + 150, y: centerPos.y };
      await canvas.click({ position: noSupportPos });
      await page.waitForTimeout(300);

      pontoonCount = await page.locator('[data-testid="pontoon-count"]').textContent();
      if (parseInt(pontoonCount || '0') === 2) { // Should still be 2
        testsPassed++;
        console.log(`✅ ${architectureName}: Level 1 without support correctly failed`);
      } else {
        console.log(`❌ ${architectureName}: Level 1 without support incorrectly succeeded`);
      }

      const successRate = (testsPassed / totalTests) * 100;
      console.log(`${architectureName} multi-level success rate: ${successRate.toFixed(1)}% (${testsPassed}/${totalTests})`);
      
      return { successRate, testsPassed, totalTests };
    };

    // Test old architecture
    const oldModeButton = page.locator('text=Switch to Old');
    if (await oldModeButton.isVisible()) {
      await oldModeButton.click();
      await page.waitForTimeout(1000);
    }
    const oldResults = await testMultiLevelPlacement('OLD');

    // Clear and test new architecture  
    const clearButton = page.locator('[data-testid="clear-grid"]');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }

    const newModeButton = page.locator('text=Switch to New');
    if (await newModeButton.isVisible()) {
      await newModeButton.click();
      await page.waitForTimeout(1000);
    }
    const newResults = await testMultiLevelPlacement('NEW');

    console.log('📊 MULTI-LEVEL PLACEMENT COMPARISON:');
    console.log(`OLD: ${oldResults.successRate.toFixed(1)}% success rate`);
    console.log(`NEW: ${newResults.successRate.toFixed(1)}% success rate`);

    // New architecture should have better or equal success rate
    expect(newResults.successRate).toBeGreaterThanOrEqual(oldResults.successRate);
    
    // New architecture should achieve perfect success rate
    expect(newResults.successRate).toBe(100);

    console.log('✅ New architecture shows improved multi-level placement consistency');
  });

  test('Performance comparison: Response times', async ({ page }) => {
    console.log('🔄 Comparing performance between architectures...');

    const measurePerformance = async (architectureName: string) => {
      console.log(`Measuring ${architectureName} performance...`);

      await page.click('[data-testid="tool-place"]', { timeout: 5000 });
      await page.click('[data-testid="level-0"]', { timeout: 5000 });

      const canvas = page.locator('canvas').first();
      const canvasBox = await canvas.boundingBox();
      if (!canvasBox) throw new Error('Canvas not found');

      const responseTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const position = {
          x: canvasBox.width * (0.2 + (i * 0.06)),
          y: canvasBox.height * 0.5
        };

        const startTime = performance.now();
        await canvas.click({ position });
        
        // Wait for processing to complete
        await page.waitForTimeout(100);
        
        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      console.log(`${architectureName} performance:`, {
        avg: avgResponseTime.toFixed(2),
        min: minResponseTime.toFixed(2),
        max: maxResponseTime.toFixed(2)
      });

      return { avgResponseTime, maxResponseTime, minResponseTime, responseTimes };
    };

    // Test old architecture
    const oldModeButton = page.locator('text=Switch to Old');
    if (await oldModeButton.isVisible()) {
      await oldModeButton.click();
      await page.waitForTimeout(1000);
    }
    const oldPerf = await measurePerformance('OLD');

    // Clear and test new architecture
    const clearButton = page.locator('[data-testid="clear-grid"]');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }

    const newModeButton = page.locator('text=Switch to New');
    if (await newModeButton.isVisible()) {
      await newModeButton.click();
      await page.waitForTimeout(1000);
    }
    const newPerf = await measurePerformance('NEW');

    console.log('📊 PERFORMANCE COMPARISON:');
    console.log(`OLD: ${oldPerf.avgResponseTime.toFixed(2)}ms avg, ${oldPerf.maxResponseTime.toFixed(2)}ms max`);
    console.log(`NEW: ${newPerf.avgResponseTime.toFixed(2)}ms avg, ${newPerf.maxResponseTime.toFixed(2)}ms max`);

    // New architecture should be faster or comparable (within 20% tolerance)
    expect(newPerf.avgResponseTime).toBeLessThanOrEqual(oldPerf.avgResponseTime * 1.2);
    
    // New architecture should have more consistent performance (lower max time)
    expect(newPerf.maxResponseTime).toBeLessThanOrEqual(oldPerf.maxResponseTime * 1.5);

    // Both should be under reasonable thresholds
    expect(newPerf.avgResponseTime).toBeLessThan(100); // Under 100ms average
    expect(newPerf.maxResponseTime).toBeLessThan(500); // Under 500ms max

    console.log('✅ New architecture shows equal or better performance');
  });
});