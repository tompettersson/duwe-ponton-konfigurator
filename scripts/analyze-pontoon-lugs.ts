#!/usr/bin/env node
/**
 * Extract exact lug Y-coordinates from Double Pontoon OBJ Model
 * 
 * Strategy:
 * - Parse all vertices
 * - Identify vertices at the corners (extreme X/Z combinations)
 * - Extract their Y-coordinates to determine lug heights
 */

import * as fs from 'fs';
import * as path from 'path';

const OBJ_PATH = path.join(process.cwd(), 'public/3d/neu/Ponton_doublle.obj');

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

function analyzeLugPositions(vertices: Vertex[]) {
  // Find X and Z ranges
  const xCoords = vertices.map(v => v.x);
  const zCoords = vertices.map(v => v.z);
  const yCoords = vertices.map(v => v.y);
  
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minZ = Math.min(...zCoords);
  const maxZ = Math.max(...zCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  
  console.log('\n=== Model Bounding Box ===');
  console.log(`X range: ${minX.toFixed(2)} to ${maxX.toFixed(2)} (width: ${(maxX - minX).toFixed(2)})`);
  console.log(`Y range: ${minY.toFixed(2)} to ${maxY.toFixed(2)} (height: ${(maxY - minY).toFixed(2)})`);
  console.log(`Z range: ${minZ.toFixed(2)} to ${maxZ.toFixed(2)} (depth: ${(maxZ - minZ).toFixed(2)})`);
  
  // Define corner regions with tolerance
  const tolerance = 50; // mm tolerance for "corner"
  
  const corners = {
    // For Double Pontoon: 3 positions along X (South, Middle, North)
    // 2 positions along Z (West, East)
    'SW': { xRange: [minX, minX + tolerance], zRange: [minZ, minZ + tolerance] },
    'W':  { xRange: [(minX+maxX)/2 - tolerance, (minX+maxX)/2 + tolerance], zRange: [minZ, minZ + tolerance] },
    'NW': { xRange: [maxX - tolerance, maxX], zRange: [minZ, minZ + tolerance] },
    'SO': { xRange: [minX, minX + tolerance], zRange: [maxZ - tolerance, maxZ] },
    'O':  { xRange: [(minX+maxX)/2 - tolerance, (minX+maxX)/2 + tolerance], zRange: [maxZ - tolerance, maxZ] },
    'NO': { xRange: [maxX - tolerance, maxX], zRange: [maxZ - tolerance, maxZ] }
  };
  
  console.log('\n=== Lug Y-Coordinates by Position ===');
  console.log('(Looking for vertices at corners to identify lug attachment heights)\n');
  
  const lugData: Record<string, { yLevels: number[]; avgY: number }> = {};
  
  for (const [name, region] of Object.entries(corners)) {
    const cornerVertices = vertices.filter(v => 
      v.x >= region.xRange[0] && v.x <= region.xRange[1] &&
      v.z >= region.zRange[0] && v.z <= region.zRange[1]
    );
    
    if (cornerVertices.length === 0) {
      console.log(`${name}: No vertices found`);
      continue;
    }
    
    // Find distinct Y-levels in this corner
    const yValues = cornerVertices.map(v => v.y).sort((a, b) => a - b);
    const levels = findDistinctYLevels(yValues, 5); // 5mm tolerance
    
    lugData[name] = {
      yLevels: levels.map(l => l.y),
      avgY: levels.reduce((sum, l) => sum + l.y, 0) / levels.length
    };
    
    console.log(`${name} (${cornerVertices.length} vertices):`);
    levels.forEach((level, idx) => {
      console.log(`  Lug ${idx + 1}: Y = ${level.y.toFixed(2)}mm (${level.count} vertices)`);
    });
    console.log(`  Average: ${lugData[name].avgY.toFixed(2)}mm`);
    console.log();
  }
  
  // Calculate relative heights (distance from bottom)
  console.log('\n=== Lug Heights from Bottom (Model Coordinate System) ===');
  for (const [name, data] of Object.entries(lugData)) {
    const heightFromBottom = data.avgY - minY;
    console.log(`${name}: ${heightFromBottom.toFixed(2)}mm from bottom`);
  }
  
  // After ModelLoader alignment, the smallest axis becomes Y
  // So these Y-coordinates will be rotated
  // Let's also check if height is actually the smallest dimension
  const width = maxX - minX;
  const height = maxY - minY;
  const depth = maxZ - minZ;
  
  const dims = [
    { name: 'Width (X)', value: width },
    { name: 'Height (Y)', value: height },
    { name: 'Depth (Z)', value: depth }
  ].sort((a, b) => a.value - b.value);
  
  console.log('\n=== Dimension Analysis ===');
  console.log('Sorted by size:');
  dims.forEach((d, idx) => {
    console.log(`  ${idx + 1}. ${d.name}: ${d.value.toFixed(2)}mm`);
  });
  console.log(`\nSmallest axis will become Y after ModelLoader alignment`);
}

function findDistinctYLevels(yValues: number[], tolerance: number): Array<{ y: number; count: number }> {
  if (yValues.length === 0) return [];
  
  const levels: Array<{ y: number; count: number }> = [];
  let currentGroup: number[] = [yValues[0]];
  
  for (let i = 1; i < yValues.length; i++) {
    if (yValues[i] - yValues[i - 1] <= tolerance) {
      currentGroup.push(yValues[i]);
    } else {
      const avgY = currentGroup.reduce((sum, val) => sum + val, 0) / currentGroup.length;
      levels.push({ y: avgY, count: currentGroup.length });
      currentGroup = [yValues[i]];
    }
  }
  
  if (currentGroup.length > 0) {
    const avgY = currentGroup.reduce((sum, val) => sum + val, 0) / currentGroup.length;
    levels.push({ y: avgY, count: currentGroup.length });
  }
  
  return levels.sort((a, b) => b.count - a.count);
}

// Main
console.log('Extracting Lug Positions from Double Pontoon OBJ...');
console.log(`File: ${OBJ_PATH}\n`);

try {
  const vertices = parseOBJ(OBJ_PATH);
  console.log(`Loaded ${vertices.length} vertices`);
  analyzeLugPositions(vertices);
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
