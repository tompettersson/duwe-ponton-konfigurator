"use client";

import React, { memo, useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { COLORS } from "../../constants/grid";

/**
 * Grid component for the pontoon configurator
 */
function Grid({
  size = { width: 40, depth: 30, height: 1 },
  color = COLORS.GRID,
  elevation = 0.01, // Small elevation above water
}) {
  // Calculate grid lines
  const halfWidth = size.width / 2;
  const halfDepth = size.depth / 2;

  // Create grid lines using useMemo for performance optimization
  const gridLines = useMemo(() => {
    const lines = [];

    // Horizontal grid lines (along X axis)
    for (let i = -halfDepth; i <= halfDepth; i++) {
      const points = [
        new THREE.Vector3(-halfWidth, elevation, i),
        new THREE.Vector3(halfWidth, elevation, i),
      ];
      lines.push({ key: `h${i}`, points });
    }

    // Vertical grid lines (along Z axis)
    for (let i = -halfWidth; i <= halfWidth; i++) {
      const points = [
        new THREE.Vector3(i, elevation, -halfDepth),
        new THREE.Vector3(i, elevation, halfDepth),
      ];
      lines.push({ key: `v${i}`, points });
    }

    return lines;
  }, [halfWidth, halfDepth, elevation]);

  return (
    <group position={[0, 0, 0]}>
      {gridLines.map(({ key, points }) => (
        <Line
          key={key}
          points={points}
          color={color}
          lineWidth={1}
          opacity={0.5}
          transparent
          dashed={true}
          dashSize={0.3}
          gapSize={0.2}
        />
      ))}
    </group>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(Grid);
