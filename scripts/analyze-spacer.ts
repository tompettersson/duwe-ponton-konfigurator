#!/usr/bin/env node
/**
 * Analyze Spacer OBJ
 * 
 * Checking dimensions and center of the spacer model to debug floating issue.
 */

import * as fs from 'fs';
import * as path from 'path';

const SPACER_DOUBLE_PATH = path.join(process.cwd(), 'public/3d/fc/Scheibe.obj');
const SPACER_SINGLE_PATH = path.join(process.cwd(), 'public/3d/fc/Einzel-Scheibe.obj');

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

function analyze(name: string, filePath: string) {
  try {
    const vertices = parseOBJ(filePath);
    const xCoords = vertices.map(v => v.x);
    const yCoords = vertices.map(v => v.y);
    const zCoords = vertices.map(v => v.z);
    
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);
    const minZ = Math.min(...zCoords);
    const maxZ = Math.max(...zCoords);
    
    console.log(`\n=== ${name} Analysis ===`);
    console.log(`File: ${filePath}`);
    console.log(`Vertices: ${vertices.length}`);
    
    console.log('Bounds:');
    console.log(`X: ${minX.toFixed(4)} to ${maxX.toFixed(4)} (Size: ${(maxX - minX).toFixed(4)})`);
    console.log(`Y: ${minY.toFixed(4)} to ${maxY.toFixed(4)} (Size: ${(maxY - minY).toFixed(4)})`);
    console.log(`Z: ${minZ.toFixed(4)} to ${maxZ.toFixed(4)} (Size: ${(maxZ - minZ).toFixed(4)})`);
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    
    console.log('Center:');
    console.log(`X: ${centerX.toFixed(4)}`);
    console.log(`Y: ${centerY.toFixed(4)}`);
    console.log(`Z: ${centerZ.toFixed(4)}`);
  } catch (error) {
    console.error(`Error analyzing ${name}:`, error);
  }
}

analyze('Double Spacer', SPACER_DOUBLE_PATH);
analyze('Single Spacer', SPACER_SINGLE_PATH);
