"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";

const WATER_CONFIG = {
  waterColor: 0x004080,
  opacity: 0.8,
};

const SimpleWater = ({ position = [0, 0, 0] }) => {
  const meshRef = useRef();

  useEffect(() => {
    if (meshRef.current) {
      const material = meshRef.current.material;
      material.needsUpdate = true;
    }
  }, []);

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[10000, 10000]} />
      <meshPhysicalMaterial
        color={WATER_CONFIG.waterColor}
        transparent={true}
        opacity={WATER_CONFIG.opacity}
        side={THREE.DoubleSide}
        roughness={0.1}
        metalness={0.1}
        clearcoat={1.0}
        clearcoatRoughness={0.2}
      />
    </mesh>
  );
};

export default SimpleWater;
