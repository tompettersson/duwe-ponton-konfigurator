"use client";

import dynamic from "next/dynamic";
import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";

// Dynamically import components that use Three.js
const Grid = dynamic(() => import("./Grid"), { ssr: false });
const GridCell = dynamic(() => import("./GridCell"), { ssr: false });
const GridElement = dynamic(() => import("./GridElement"), { ssr: false });
const SimpleWater = dynamic(() => import("./SimpleWater"), { ssr: false });
const Sun = dynamic(() => import("./Sun"), { ssr: false });

function Scene({
  gridSize,
  waterLevel,
  elements,
  gridElements,
  isPerspective,
}) {
  return (
    <Canvas
      className="w-full h-full"
      style={{ background: "#E7F8FF" }}
      camera={{ position: [0, 5, 10], fov: 75 }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color("#E7F8FF"));
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.5;
      }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.4} />
        <Sun position={[10, 10, 10]} />
        <directionalLight position={[-10, 10, -10]} intensity={0.5} />
        {isPerspective ? (
          <PerspectiveCamera makeDefault position={[10, 10, 10]} />
        ) : (
          <OrthographicCamera makeDefault position={[0, 10, 0]} zoom={30} />
        )}
        <OrbitControls enabled={isPerspective} />
        <Grid size={gridSize} />
        {gridElements.map(({ key, ...props }) => (
          <GridCell key={key} {...props} />
        ))}
        {elements.map((element, index) => (
          <GridElement
            key={index}
            position={element.position}
            waterLevel={waterLevel}
          />
        ))}
        <SimpleWater position={[0, waterLevel, 0]} />
      </Suspense>
    </Canvas>
  );
}

export default Scene;
