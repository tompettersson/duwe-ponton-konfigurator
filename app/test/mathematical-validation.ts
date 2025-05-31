/**
 * Mathematical Validation Tests
 * 
 * Validates the mathematical precision of our grid system
 * Run these tests in browser console to verify implementation
 */

import { GridMathematics } from '../lib/grid/GridMathematics';
import { SpatialHashGrid } from '../lib/grid/SpatialHashGrid';
import * as THREE from 'three';

export function runMathematicalValidation() {
  console.log('🧮 Starting Mathematical Validation Tests...\n');

  const gridMath = new GridMathematics(400); // 0.4m cells
  const spatialGrid = new SpatialHashGrid(400);
  
  let testsPassed = 0;
  let totalTests = 0;

  function test(name: string, condition: boolean) {
    totalTests++;
    if (condition) {
      testsPassed++;
      console.log(`✅ ${name}`);
    } else {
      console.error(`❌ ${name}`);
    }
  }

  // Test 1: Coordinate Conversion Precision
  console.log('1. Testing Coordinate Conversion Precision');
  const worldPos = new THREE.Vector3(0.4, 0, 0.8); // 1 cell right, 2 cells forward
  const gridPos = gridMath.worldToGrid(worldPos);
  const backToWorld = gridMath.gridToWorld(gridPos);
  
  test('World to Grid conversion', gridPos.x === 1 && gridPos.z === 2);
  test('Grid to World conversion precision', 
    Math.abs(backToWorld.x - 0.4) < 0.001 && 
    Math.abs(backToWorld.z - 0.8) < 0.001
  );

  // Test 2: Snap to Grid Functionality
  console.log('\n2. Testing Snap-to-Grid Functionality');
  const imprecisePos = new THREE.Vector3(0.37, 0, 0.82);
  const snappedPos = gridMath.snapToGrid(imprecisePos);
  test('Snap to grid precision', 
    Math.abs(snappedPos.x - 0.4) < 0.001 && 
    Math.abs(snappedPos.z - 0.8) < 0.001
  );

  // Test 3: Grid Key Generation
  console.log('\n3. Testing Grid Key Generation');
  const key = gridMath.getGridKey({ x: 5, y: 1, z: 10 });
  const parsedPos = gridMath.parseGridKey(key);
  test('Grid key consistency', 
    key === '5,1,10' && 
    parsedPos.x === 5 && parsedPos.y === 1 && parsedPos.z === 10
  );

  // Test 4: Spatial Hash Grid Operations
  console.log('\n4. Testing Spatial Hash Grid');
  spatialGrid.clear();
  
  spatialGrid.insert('test1', { x: 0, y: 0, z: 0 });
  spatialGrid.insert('test2', { x: 1, y: 0, z: 0 });
  spatialGrid.insert('test3', { x: 0, y: 0, z: 1 });
  
  test('Element insertion', spatialGrid.getElementCount() === 3);
  
  const collision = spatialGrid.checkCollision({ x: 0, y: 0, z: 0 });
  test('Collision detection', collision === true);
  
  const noCollision = spatialGrid.checkCollision({ x: 5, y: 0, z: 5 });
  test('No collision detection', noCollision === false);
  
  spatialGrid.remove('test1');
  test('Element removal', spatialGrid.getElementCount() === 2);

  // Test 5: Multi-cell Element Support
  console.log('\n5. Testing Multi-cell Elements');
  spatialGrid.clear();
  spatialGrid.insert('double', { x: 0, y: 0, z: 0 }, { x: 2, y: 1, z: 1 });
  
  const collisionAt0 = spatialGrid.checkCollision({ x: 0, y: 0, z: 0 });
  const collisionAt1 = spatialGrid.checkCollision({ x: 1, y: 0, z: 0 });
  const noCollisionAt2 = spatialGrid.checkCollision({ x: 2, y: 0, z: 0 });
  
  test('Multi-cell collision at (0,0,0)', collisionAt0);
  test('Multi-cell collision at (1,0,0)', collisionAt1);
  test('No collision beyond bounds at (2,0,0)', !noCollisionAt2);

  // Test 6: Performance Validation
  console.log('\n6. Testing Performance');
  spatialGrid.clear();
  
  const startTime = performance.now();
  for (let i = 0; i < 1000; i++) {
    spatialGrid.insert(`perf${i}`, { 
      x: Math.floor(Math.random() * 50), 
      y: 0, 
      z: Math.floor(Math.random() * 50) 
    });
  }
  const insertTime = performance.now() - startTime;
  
  const queryStartTime = performance.now();
  for (let i = 0; i < 1000; i++) {
    spatialGrid.query({ 
      x: Math.floor(Math.random() * 50), 
      y: 0, 
      z: Math.floor(Math.random() * 50) 
    });
  }
  const queryTime = performance.now() - queryStartTime;
  
  test('Insert performance', insertTime < 100); // Should be very fast
  test('Query performance', queryTime < 50); // Should be very fast
  
  console.log(`📊 Insert time for 1000 elements: ${insertTime.toFixed(2)}ms`);
  console.log(`📊 Query time for 1000 queries: ${queryTime.toFixed(2)}ms`);

  // Test 7: Mathematical Precision Validation
  console.log('\n7. Testing Mathematical Precision');
  const cellSizeMeters = gridMath.getCellSizeMeters();
  const cellSizeMM = gridMath.getCellSizeMM();
  
  test('Cell size precision', 
    Math.abs(cellSizeMeters - 0.4) < 0.0001 && 
    cellSizeMM === 400
  );

  // Test 8: Grid Bounds Validation
  console.log('\n8. Testing Grid Bounds');
  const gridBounds = { width: 50, height: 50 };
  
  test('Valid position check', 
    gridMath.isInBounds({ x: 25, y: 0, z: 25 }, gridBounds)
  );
  test('Invalid position check', 
    !gridMath.isInBounds({ x: 60, y: 0, z: 25 }, gridBounds)
  );

  // Test 9: Spatial Consistency Validation
  console.log('\n9. Testing Spatial Consistency');
  const isConsistent = spatialGrid.validateConsistency();
  test('Spatial index consistency', isConsistent);

  // Results
  console.log(`\n🎯 Mathematical Validation Results:`);
  console.log(`✅ Tests Passed: ${testsPassed}/${totalTests}`);
  console.log(`📈 Success Rate: ${((testsPassed/totalTests) * 100).toFixed(1)}%`);
  
  if (testsPassed === totalTests) {
    console.log('🎉 All mathematical precision tests PASSED!');
    console.log('💪 The foundation is mathematically sound and ready for production.');
  } else {
    console.error('⚠️  Some tests failed. Mathematical precision needs attention.');
  }

  return {
    passed: testsPassed,
    total: totalTests,
    success: testsPassed === totalTests
  };
}

// Browser Console Helper
if (typeof window !== 'undefined') {
  (window as any).__runMathematicalValidation = runMathematicalValidation;
  console.log('🧮 Mathematical validation available: __runMathematicalValidation()');
}