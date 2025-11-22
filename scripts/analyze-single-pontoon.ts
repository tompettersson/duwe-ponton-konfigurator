#!/usr/bin/env node
/**
 * Analyze Pre-Aligned Single Pontoon Model
 * 
 * This is much simpler now - no rotation transformations needed!
 * The model is already in the correct orientation.
 */

import * as fs from 'fs';
import * as path from 'path';

const ALIGNED_OBJ_PATH = path.join(process.cwd(), 'public/3d/neu/Ponton_single_aligned.obj');

interface Vertex {
  x: number;
  y: number;
  z: number;
}

function parseOBJ(filePath: string): Vertex[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const vertices: Vertex[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('v ')) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4) {
        vertices.push({
          x: parseFloat(parts[1]),
          y: parseFloat(parts[2]),
          z: parseFloat(parts[3])
        });
      }
    }
  }
  
  return vertices;
}

function analyzeLugs(vertices: Vertex[]) {
  const xCoords = vertices.map(v => v.x);
  const yCoords = vertices.map(v => v.y);
  const zCoords = vertices.map(v => v.z);
  
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  const minZ = Math.min(...zCoords);
  const maxZ = Math.max(...zCoords);
  
  console.log('\n=== Pre-Aligned Model Bounding Box ===');
  console.log(`X range: ${minX.toFixed(2)} to ${maxX.toFixed(2)} (width: ${(maxX - minX).toFixed(2)})`);
  console.log(`Y range: ${minY.toFixed(2)} to ${maxY.toFixed(2)} (height: ${(maxY - minY).toFixed(2)})`);
  console.log(`Z range: ${minZ.toFixed(2)} to ${maxZ.toFixed(2)} (depth: ${(maxZ - minZ).toFixed(2)})`);
  
  console.log('\n✅ Model is already Y-up oriented!');
  console.log('Grid X+ = North, Grid Z+ = East, Grid Y+ = Height\n');
  
  // Define corners
  const tolerance = 30;
  
  const corners = {
    '(0,0) SW': { xRange: [minX, minX + tolerance], zRange: [minZ, minZ + tolerance] },
    '(1,0) NW': { xRange: [maxX - tolerance, maxX], zRange: [minZ, minZ + tolerance] },
    '(0,1) SE': { xRange: [minX, minX + tolerance], zRange: [maxZ - tolerance, maxZ] },
    '(1,1) NE': { xRange: [maxX - tolerance, maxX], zRange: [maxZ - tolerance, maxZ] }
  };
  
  console.log('=== Lug Peak Heights (Direct from OBJ) ===\n');
  
  const lugData: Record<string, { maxY: number; heightFromBottom: number }> = {};
  
  for (const [name, region] of Object.entries(corners)) {
    const cornerVertices = vertices.filter(v => 
      v.x >= region.xRange[0] && v.x <= region.xRange[1] &&
      v.z >= region.zRange[0] && v.z <= region.zRange[1]
    );
    
    if (cornerVertices.length === 0) {
      console.log(`${name}: No vertices found`);
      continue;
    }
    
    const yValues = cornerVertices.map(v => v.y);
    const maxYValue = Math.max(...yValues);
    const heightFromBottom = maxYValue - minY;
    
    lugData[name] = { maxY: maxYValue, heightFromBottom };
    
    console.log(`${name}:`);
    console.log(`  Vertices: ${cornerVertices.length}`);
    console.log(`  Peak Y: ${maxYValue.toFixed(2)}mm`);
    console.log(`  Height from bottom: ${heightFromBottom.toFixed(2)}mm`);
    console.log();
  }
  
  // Sort by height
  const sorted = Object.entries(lugData)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => a.heightFromBottom - b.heightFromBottom);
  
  console.log('=== Layer Assignment ===');
  sorted.forEach((item, idx) => {
    const layer = idx + 1;
    console.log(`Layer ${layer}: ${item.name.padEnd(20)} → ${item.heightFromBottom.toFixed(2)}mm`);
  });
  
  console.log('\n=== Configuration ===');
  console.log('```typescript');
  console.log('[PontoonType.SINGLE]: {');
  sorted.forEach((item) => {
    const layer = sorted.indexOf(item) + 1;
    const gridCoord = item.name.substring(0, 5).trim();
    const label = item.name.substring(6);
    console.log(`  '${gridCoord}': { layer: ${layer} }, // ${label}: ${item.heightFromBottom.toFixed(0)}mm`);
  });
  console.log('}');
  console.log('```');
}

console.log('=== Analyzing Pre-Aligned Single Pontoon ===');
console.log(`File: ${ALIGNED_OBJ_PATH}\n`);

try {
  const vertices = parseOBJ(ALIGNED_OBJ_PATH);
  console.log(`Loaded ${vertices.length} vertices`);
  analyzeLugs(vertices);
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
