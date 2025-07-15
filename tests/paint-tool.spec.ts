import { test, expect } from '@playwright/test';

test.describe('Paint Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-new-architecture');
    await page.waitForLoadState('networkidle');
  });

  test('should change pontoon color on click', async ({ page }) => {
    // Step 1: Place a pontoon first (defaults to blue)
    await page.getByTestId('tool-place').click();
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    
    // Verify pontoon was placed with blue color
    await expect(page.getByText('Pontoon-Here: YES')).toBeVisible();
    await expect(page.getByText('Pontoon-Color: blue')).toBeVisible();
    
    // Step 2: Change current color to black
    await page.getByRole('button', { name: 'Schwarz' }).click();
    await expect(page.getByText('Current-Color: black')).toBeVisible();
    
    // Step 3: Switch to paint tool
    await page.getByTestId('tool-paint').click();
    await expect(page.getByText('Tool: paint')).toBeVisible();
    
    // Step 4: Click on the placed pontoon to paint it
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    
    // Step 5: Verify color changed to black
    await expect(page.getByText('Pontoon-Color: black')).toBeVisible();
    await expect(page.getByText('Last-Click: SUCCESS')).toBeVisible();
  });

  test('should work with all available colors', async ({ page }) => {
    // Step 1: Place a pontoon first
    await page.getByTestId('tool-place').click();
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    
    // Step 2: Switch to paint tool
    await page.getByTestId('tool-paint').click();
    
    const colors = [
      { name: 'Schwarz', value: 'black' },
      { name: 'Grau', value: 'grey' },
      { name: 'Gelb', value: 'yellow' },
      { name: 'Blau', value: 'blue' }
    ];
    
    for (const color of colors) {
      // Change current color
      await page.getByRole('button', { name: color.name }).click();
      await expect(page.getByText(`Current-Color: ${color.value}`)).toBeVisible();
      
      // Paint the pontoon
      await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
      
      // Verify color change
      await expect(page.getByText(`Pontoon-Color: ${color.value}`)).toBeVisible();
      await expect(page.getByText('Last-Click: SUCCESS')).toBeVisible();
    }
  });

  test('should show error when trying to paint with same color', async ({ page }) => {
    // Step 1: Place a blue pontoon
    await page.getByTestId('tool-place').click();
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    
    // Step 2: Switch to paint tool (blue is already selected)
    await page.getByTestId('tool-paint').click();
    
    // Step 3: Try to paint with same color (blue)
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    
    // Should show error
    await expect(page.getByText('Last-Click: FAILED')).toBeVisible();
  });

  test('should show error when clicking on empty space', async ({ page }) => {
    // Switch to paint tool
    await page.getByTestId('tool-paint').click();
    await expect(page.getByText('Tool: paint')).toBeVisible();
    
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
    await expect(page.getByText('Pontoon-Color: blue')).toBeVisible();
    
    // Step 3: Change to red color
    await page.getByRole('button', { name: 'Gelb' }).click();
    await expect(page.getByText('Current-Color: yellow')).toBeVisible();
    
    // Step 4: Switch to paint tool
    await page.getByTestId('tool-paint').click();
    
    // Step 5: Paint the double pontoon
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    
    // Step 6: Verify color changed
    await expect(page.getByText('Pontoon-Color: yellow')).toBeVisible();
    await expect(page.getByText('Last-Click: SUCCESS')).toBeVisible();
  });

  test('should work on different levels', async ({ page }) => {
    // Step 1: Place pontoon on level 0
    await page.getByTestId('tool-place').click();
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    
    // Step 2: Switch to level 1
    await page.getByTestId('level-1').click();
    await expect(page.getByText('Level: 1')).toBeVisible();
    
    // Step 3: Place pontoon on level 1
    await page.getByTestId('tool-place').click();
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    
    // Step 4: Change to black color
    await page.getByRole('button', { name: 'Schwarz' }).click();
    
    // Step 5: Switch to paint tool
    await page.getByTestId('tool-paint').click();
    
    // Step 6: Paint the level 1 pontoon
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    
    // Step 7: Verify color changed for level 1 pontoon
    await expect(page.getByText('Pontoon-Color: black')).toBeVisible();
    await expect(page.getByText('Last-Click: SUCCESS')).toBeVisible();
  });

  test('should show cursor change when paint tool is active', async ({ page }) => {
    // Switch to paint tool
    await page.getByTestId('tool-paint').click();
    
    // Verify tool is active
    await expect(page.getByText('Tool: paint')).toBeVisible();
    
    // Verify paint button is highlighted
    await expect(page.getByTestId('tool-paint')).toHaveClass(/bg-blue-500/);
  });

  test('should paint multiple pontoons with different colors', async ({ page }) => {
    // Step 1: Place multiple pontoons
    await page.getByTestId('tool-place').click();
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 450, y: 300 } });
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 350 } });
    
    // Step 2: Switch to paint tool
    await page.getByTestId('tool-paint').click();
    
    // Step 3: Paint first pontoon black
    await page.getByRole('button', { name: 'Schwarz' }).click();
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 300 } });
    await expect(page.getByText('Pontoon-Color: black')).toBeVisible();
    
    // Step 4: Paint second pontoon yellow
    await page.getByRole('button', { name: 'Gelb' }).click();
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 450, y: 300 } });
    await expect(page.getByText('Pontoon-Color: yellow')).toBeVisible();
    
    // Step 5: Paint third pontoon grey
    await page.getByRole('button', { name: 'Grau' }).click();
    await page.locator('[data-testid="3d-canvas"]').click({ position: { x: 400, y: 350 } });
    await expect(page.getByText('Pontoon-Color: grey')).toBeVisible();
  });
});