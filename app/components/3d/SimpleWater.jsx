"use client";

import React, { memo } from "react";
import * as THREE from "three";
import { COLORS } from "../../constants/grid";

/**
 * Simple water plane component
 */
function SimpleWater({ position = [0, 0, 0], size = [100, 100] }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        color={COLORS.WATER}
        transparent
        opacity={0.6}
        roughness={0.1}
        metalness={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(SimpleWater);
