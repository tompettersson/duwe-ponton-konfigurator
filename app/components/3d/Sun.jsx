"use client";

import React, { memo, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Soft lighting setup: hemisphere + subtle directional sun (no shadows).
 * Fog is temporarily removed for testing.
 */
function Sun({ position = [10, 10, 10], intensity = 0.7 }) {
  // const { scene } = useThree(); // Scene access for fog removed
  // useEffect(() => {
  //   // Restore fog with a light color
  //   scene.fog = new THREE.FogExp2("#F8FBFF", 0.0005);
  //   return () => {
  //     scene.fog = null;
  //   };
  // }, [scene]);

  return (
    <>
      {/* sky (light blue) to ground (desaturated) gradient */}
      <hemisphereLight
        skyColor={0xffffff}
        groundColor={0x79a6c1}
        intensity={1.5}
      />
      {/* soft global ambient fill */}
      <ambientLight intensity={0.8} />
      {/* subtle sun highlight for water reflections */}
      <directionalLight
        position={position}
        intensity={intensity * 1.5}
        color="#ffffff"
      />
    </>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(Sun);
