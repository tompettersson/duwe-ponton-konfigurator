"use client";

import React, { memo, useMemo } from "react";
import * as THREE from "three";
import { COLORS } from "../../constants/grid";

/**
 * Grid component – performant implementation using a single LineSegments draw call
 */
function Grid({
  size = { width: 40, depth: 30, height: 1 },
  color = COLORS.GRID,
  elevation = 0.01, // Slightly above water
}) {
  // Memoised geometry containing all grid lines
  const gridGeometry = useMemo(() => {
    const { width, depth } = size;
    const halfWidth = width / 2;
    const halfDepth = depth / 2;

    const vertices = [];

    // Horizontal lines (along X)
    for (let z = -halfDepth; z <= halfDepth; z++) {
      vertices.push(-halfWidth, elevation, z, halfWidth, elevation, z);
    }

    // Vertical lines (along Z)
    for (let x = -halfWidth; x <= halfWidth; x++) {
      vertices.push(x, elevation, -halfDepth, x, elevation, halfDepth);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    return geometry;
  }, [size, elevation]);

  return (
    <lineSegments geometry={gridGeometry} frustumCulled={false}>
      <lineBasicMaterial
        color={color}
        linewidth={1}
        transparent
        opacity={0.5}
      />
    </lineSegments>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(Grid);
