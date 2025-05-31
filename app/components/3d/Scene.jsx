"use client";

import dynamic from "next/dynamic";
import React, { Suspense, memo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import { COLORS } from "../../constants/grid";

// Dynamically import components that use Three.js
const InteractiveGrid = dynamic(() => import("./SimpleGridSystem"), { ssr: false });
const WaterPlane = dynamic(() => import("./WaterPlane"), { ssr: false });
const Sun = dynamic(() => import("./Sun"), { ssr: false });
const PontoonInstances = dynamic(() => import("./PontoonInstances"), {
  ssr: false,
});
const PontoonModels = dynamic(() => import("./PontoonModels"), {
  ssr: false,
});

/**
 * Main 3D scene component for the pontoon configurator
 */
function Scene({
  gridSize,
  waterLevel,
  elements,
  onCellClick,
  selectedTool,
  storeElements,
  isPerspective,
  currentLevel,
  levelHeight,
}) {

  return (
    <Canvas
      className="w-full h-full"
      style={{
        background: "transparent",
        position: "relative",
      }}
      camera={{ position: [0, 20, 40], fov: 75 }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color("#87CEEB"), 1); // Sky blue background
        gl.toneMapping = THREE.NoToneMapping;
      }}
    >
      <Suspense fallback={null}>
        {/* Fallback color if Sky doesn't render */}
        {/* <color attach="background" args={["#a9d8ff"]} /> */}

        <Sun position={[50, 50, 50]} />

        {isPerspective ? (
          <PerspectiveCamera makeDefault position={[8, 6, 8]} />
        ) : (
          <OrthographicCamera makeDefault position={[0, 40, 0]} zoom={5} />
        )}
        <OrbitControls enabled={isPerspective} />

        {/* Interactive Grid System */}
        <InteractiveGrid
          onCellClick={onCellClick}
          selectedTool={selectedTool}
          elements={storeElements}
          currentLevel={currentLevel}
          levelHeight={levelHeight}
        />

        {/* Single pontoons only - simple boxes for uniform system */}
        <PontoonInstances
          elements={elements.filter((e) => e.isCurrentLevel && e.type === 'single')}
          opacity={1.0}
          color={null}
        />
        <PontoonInstances
          elements={elements.filter((e) => !e.isCurrentLevel && e.type === 'single')}
          opacity={1.0}
          color="#888888"
        />

        {/* Water removed for cleaner interface */}
      </Suspense>
    </Canvas>
  );
}

// Memoize the Scene component to prevent unnecessary re-renders
export default memo(Scene);
