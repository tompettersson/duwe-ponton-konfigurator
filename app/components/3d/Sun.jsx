"use client";

import React, { memo } from "react";

/**
 * Sun component for lighting the scene
 */
function Sun({ position = [10, 10, 10], intensity = 1.5 }) {
  return (
    <directionalLight
      position={position}
      intensity={intensity}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
    >
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="#FFFF99" />
    </directionalLight>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(Sun);
