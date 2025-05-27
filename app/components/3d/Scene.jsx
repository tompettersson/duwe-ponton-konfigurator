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
        gl.setClearColor(new THREE.Color("#a9d8ff"), 0);
        gl.getContextAttributes().alpha = true;
        gl.toneMapping = THREE.LinearToneMapping;
      }}
    >
      <Suspense fallback={null}>
        {/* Fallback color if Sky doesn't render */}
        {/* <color attach="background" args={["#a9d8ff"]} /> */}

        <Sun position={[50, 50, 50]} />

        {isPerspective ? (
          <PerspectiveCamera makeDefault position={[40, 40, 40]} />
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

        {/* Pontoons with clear level-based visibility */}
        {/* MIXED: Single pontoons use boxes, double pontoons use 3D models */}
        
        {/* Single pontoons - use simple boxes */}
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
        
        {/* Double pontoons - use 3D models */}
        <PontoonModels
          elements={elements.filter((e) => e.isCurrentLevel && e.type === 'double')}
          opacity={1.0}
          color={null}
        />
        <PontoonModels
          elements={elements.filter((e) => !e.isCurrentLevel && e.type === 'double')}
          opacity={1.0}
          color="#888888"
        />

        {/* Simple water without reflections */}
        <WaterPlane width={(gridSize.width + 10) * 2} depth={(gridSize.depth + 10) * 2} y={-0.2} />
      </Suspense>
    </Canvas>
  );
}

// Memoize the Scene component to prevent unnecessary re-renders
export default memo(Scene);
