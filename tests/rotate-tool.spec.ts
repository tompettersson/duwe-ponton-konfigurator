import { test, expect } from '@playwright/test';

test.describe('Rotate Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-new-architecture');
    await page.waitForLoadState('networkidle');
  });

  test('should rotate a pontoon 90 degrees on click', async ({ page }) => {
    // Step 1: Place a pontoon first
    await page.getByTestId('tool-place').click();
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    
    // Verify pontoon was placed
    await expect(page.getByText('Pontoon-Here: YES')).toBeVisible();
    await expect(page.getByText('Pontoon-Rotation: 0°')).toBeVisible();
    
    // Step 2: Switch to rotate tool
    await page.getByTestId('tool-rotate').click();
    await expect(page.getByText('Tool: rotate')).toBeVisible();
    
    // Step 3: Click on the placed pontoon to rotate it
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    
    // Step 4: Verify rotation changed to 90 degrees
    await expect(page.getByText('Pontoon-Rotation: 90°')).toBeVisible();
    await expect(page.getByText('Last-Click: SUCCESS')).toBeVisible();
    
    // Step 5: Rotate again to test 180 degrees
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    await expect(page.getByText('Pontoon-Rotation: 180°')).toBeVisible();
    
    // Step 6: Rotate again to test 270 degrees
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    await expect(page.getByText('Pontoon-Rotation: 270°')).toBeVisible();
    
    // Step 7: Rotate again to test back to 0 degrees (full rotation)
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    await expect(page.getByText('Pontoon-Rotation: 0°')).toBeVisible();
  });

  test('should show error when clicking on empty space', async ({ page }) => {
    // Switch to rotate tool
    await page.getByTestId('tool-rotate').click();
    await expect(page.getByText('Tool: rotate')).toBeVisible();
    
    // Click on empty space
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 100, y: 100 } });
    
    // Should show error
    await expect(page.getByText('Last-Click: FAILED')).toBeVisible();
  });

  test('should work with double pontoons', async ({ page }) => {
    // Step 1: Select double pontoon type
    await page.getByTestId('pontoon-double').click();
    
    // Step 2: Place a double pontoon
    await page.getByTestId('tool-place').click();
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    
    // Verify double pontoon was placed
    await expect(page.getByText('Pontoon-Here: YES')).toBeVisible();
    await expect(page.getByText('Pontoon-Rotation: 0°')).toBeVisible();
    
    // Step 3: Switch to rotate tool
    await page.getByTestId('tool-rotate').click();
    
    // Step 4: Rotate the double pontoon
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    
    // Step 5: Verify rotation changed
    await expect(page.getByText('Pontoon-Rotation: 90°')).toBeVisible();
    await expect(page.getByText('Last-Click: SUCCESS')).toBeVisible();
  });

  test('should work on different levels', async ({ page }) => {
    // Step 1: Place pontoon on level 0
    await page.getByTestId('tool-place').click();
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    
    // Step 2: Switch to level 1
    await page.getByTestId('level-1').click();
    await expect(page.getByText('Level: 1')).toBeVisible();
    
    // Step 3: Place pontoon on level 1 (directly above level 0 pontoon)
    await page.getByTestId('tool-place').click();
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    
    // Step 4: Switch to rotate tool
    await page.getByTestId('tool-rotate').click();
    
    // Step 5: Rotate the level 1 pontoon
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    
    // Step 6: Verify rotation changed for level 1 pontoon
    await expect(page.getByText('Pontoon-Rotation: 90°')).toBeVisible();
    await expect(page.getByText('Last-Click: SUCCESS')).toBeVisible();
  });

  test('should show cursor change when rotate tool is active', async ({ page }) => {
    // Switch to rotate tool
    await page.getByTestId('tool-rotate').click();
    
    // Verify tool is active
    await expect(page.getByText('Tool: rotate')).toBeVisible();
    
    // Verify rotate button is highlighted
    await expect(page.getByTestId('tool-rotate')).toHaveClass(/bg-blue-500/);
  });
});