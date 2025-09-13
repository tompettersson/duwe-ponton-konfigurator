const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Navigating to 3D model test page...');
  await page.goto('http://localhost:3002/test-3d-model');
  
  // Wait for model to load
  await page.waitForTimeout(3000);
  
  // Get the info text
  const infoText = await page.locator('pre').textContent();
  
  console.log('\n=== 3D MODEL ANALYSIS ===');
  console.log(infoText);
  
  // Take screenshot
  await page.screenshot({ 
    path: 'tests/screenshots/3d-model-loaded.png',
    fullPage: true 
  });
  console.log('\nScreenshot saved to tests/screenshots/3d-model-loaded.png');
  
  // Extract dimensions
  const dimensionsMatch = infoText?.match(/Dimensions: (\d+)mm x (\d+)mm x (\d+)mm/);
  if (dimensionsMatch) {
    console.log(`\nExtracted dimensions:`);
    console.log(`- Width: ${dimensionsMatch[1]}mm`);
    console.log(`- Height: ${dimensionsMatch[2]}mm`);
    console.log(`- Depth: ${dimensionsMatch[3]}mm`);
  }
  
  // Now test the main configurator
  console.log('\n\nTesting main configurator...');
  await page.goto('http://localhost:3002/test-new-architecture');
  await page.waitForTimeout(1000);
  
  // Set up dialog handler
  page.on('dialog', async dialog => {
    console.log('\n=== ALERT MESSAGE ===');
    console.log(dialog.message());
    await dialog.accept();
  });
  
  // Click the 3D Model Test button
  await page.click('button:has-text("🧊 3D Modell Test")');
  await page.waitForTimeout(2000);
  
  // Capture console logs
  const logs = [];
  await page.evaluate(() => {
    console.log('Test console capture');
  });
  
  await page.waitForTimeout(5000);
  
  await browser.close();
  console.log('\nTest completed!');
})();