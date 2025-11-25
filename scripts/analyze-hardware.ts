#!/usr/bin/env node
/**
 * Analyze Bolt and Nut OBJ
 */

import * as fs from 'fs';
import * as path from 'path';

function parseObjBounds(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let vertexCount = 0;

  lines.forEach(line => {
    if (line.startsWith('v ')) {
      const parts = line.trim().split(/\s+/);
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]);

      if (!isNaN(y)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
        vertexCount++;
      }
    }
  });

  return { minX, maxX, minY, maxY, minZ, maxZ, vertexCount };
}

function analyze(name, relativePath) {
  const fullPath = path.join(process.cwd(), relativePath);
  console.log(`\n=== ${name} Analysis ===`);
  console.log(`File: ${fullPath}`);
  
  if (!fs.existsSync(fullPath)) {
    console.log('File not found!');
    return;
  }

  const bounds = parseObjBounds(fullPath);
  console.log(`X Bounds: ${bounds.minX.toFixed(4)} to ${bounds.maxX.toFixed(4)} (Width: ${(bounds.maxX - bounds.minX).toFixed(4)})`);
  console.log(`Y Bounds: ${bounds.minY.toFixed(4)} to ${bounds.maxY.toFixed(4)} (Height: ${(bounds.maxY - bounds.minY).toFixed(4)})`);
  console.log(`Z Bounds: ${bounds.minZ.toFixed(4)} to ${bounds.maxZ.toFixed(4)} (Depth: ${(bounds.maxZ - bounds.minZ).toFixed(4)})`);
  console.log(`Center Y: ${((bounds.minY + bounds.maxY) / 2).toFixed(4)}`);
}

// Analyze the models used in RenderingEngine
analyze('Pin (Randverbinder1)', 'public/3d/fc/Randverbinder1.obj');
analyze('Nut (Randverbinder2)', 'public/3d/fc/Randverbinder2.obj');
analyze('Bolt (Flutschraube)', 'public/3d/fc/Flutschraube.obj');
