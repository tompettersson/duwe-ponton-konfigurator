#!/usr/bin/env node
/**
 * Pre-Process Single Pontoon OBJ - Apply Rotation
 * 
 * This script rotates the Single Pontoon OBJ model to match the expected
 * orientation, eliminating the need for runtime rotation in ModelLoader.
 * 
 * Transformation: Rotate -90° around X-axis (Z → Y for height)
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_PATH = path.join(process.cwd(), 'public/3d/neu/Ponton_single.obj');
const OUTPUT_PATH = path.join(process.cwd(), 'public/3d/neu/Ponton_single_aligned.obj');

interface Vertex {
  x: number;
  y: number;
  z: number;
}

// Apply -90° rotation around X-axis
function rotateVertex(v: Vertex): Vertex {
  // Rotation matrix for -90° around X:
  // x' = x
  // y' = z
  // z' = -y
  return {
    x: v.x,
    y: v.z,
    z: -v.y
  };
}

function processOBJ(inputPath: string, outputPath: string): void {
  console.log('Reading OBJ file...');
  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n');
  
  console.log('Processing vertices...');
  const outputLines: string[] = [];
  let vertexCount = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('v ')) {
      // Parse vertex
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4) {
        const vertex: Vertex = {
          x: parseFloat(parts[1]),
          y: parseFloat(parts[2]),
          z: parseFloat(parts[3])
        };
        
        // Apply rotation
        const rotated = rotateVertex(vertex);
        
        // Write rotated vertex
        outputLines.push(`v ${rotated.x.toFixed(6)} ${rotated.y.toFixed(6)} ${rotated.z.toFixed(6)}`);
        vertexCount++;
      } else {
        outputLines.push(line);
      }
    } else if (trimmed.startsWith('vn ')) {
      // Parse and rotate vertex normal
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4) {
        const normal: Vertex = {
          x: parseFloat(parts[1]),
          y: parseFloat(parts[2]),
          z: parseFloat(parts[3])
        };
        
        const rotated = rotateVertex(normal);
        outputLines.push(`vn ${rotated.x.toFixed(6)} ${rotated.y.toFixed(6)} ${rotated.z.toFixed(6)}`);
      } else {
        outputLines.push(line);
      }
    } else {
      // Copy all other lines unchanged (faces, texture coords, etc.)
      outputLines.push(line);
    }
  }
  
  console.log(`Processed ${vertexCount} vertices`);
  console.log('Writing aligned OBJ file...');
  fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf-8');
  console.log(`✅ Created: ${outputPath}`);
}

console.log('=== Single Pontoon OBJ Pre-Processing ===\n');
console.log(`Input:  ${INPUT_PATH}`);
console.log(`Output: ${OUTPUT_PATH}\n`);

try {
  processOBJ(INPUT_PATH, OUTPUT_PATH);
  console.log('\n✅ Pre-processing complete!');
  console.log('The aligned model is now ready to use without runtime rotation.');
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
