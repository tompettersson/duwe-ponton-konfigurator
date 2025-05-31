"use client";

import React, { memo } from "react";

/**
 * Simplified lighting setup for performance and visual clarity.
 * Single ambient light for consistent illumination without color bleeding.
 */
function Sun() {
  return (
    <>
      {/* Single clean ambient light - no color bleeding */}
      <ambientLight intensity={1.0} color={0xffffff} />
      
      {/* Optional subtle directional for pontoon definition */}
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.3}
        color={0xffffff}
        castShadow={false}
      />
    </>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(Sun);
