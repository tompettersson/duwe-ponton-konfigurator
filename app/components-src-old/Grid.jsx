"use client";

import React, { useMemo } from "react";
import {
  BufferGeometry,
  Float32BufferAttribute,
  LineDashedMaterial,
  LineSegments,
} from "three";

function Grid({ size }) {
  const gridLines = useMemo(() => {
    const vertices = [];

    // Generate vertical lines on the y-axis (height)
    for (let x = -size.width / 2; x <= size.width / 2; x++) {
      for (let z = -size.depth / 2; z <= size.depth / 2; z++) {
        vertices.push(x, -size.height / 2, z, x, size.height / 2, z);
      }
    }

    // Generate horizontal lines on the x-z plane (width and depth)
    for (let y = -size.height / 2; y <= size.height / 2; y++) {
      for (let x = -size.width / 2; x <= size.width / 2; x++) {
        vertices.push(x, y, -size.depth / 2, x, y, size.depth / 2);
      }

      for (let z = -size.depth / 2; z <= size.depth / 2; z++) {
        vertices.push(-size.width / 2, y, z, size.width / 2, y, z);
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));

    return geometry;
  }, [size]);

  return (
    <lineSegments>
      <primitive object={gridLines} />
      <lineDashedMaterial
        color={0xbbddff}
        linewidth={1}
        scale={1}
        dashSize={0.1}
        gapSize={0.05}
      />
    </lineSegments>
  );
}

export default Grid;
