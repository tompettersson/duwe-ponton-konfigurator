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
const Grid = dynamic(() => import("./Grid"), { ssr: false });
const GridCell = dynamic(() => import("./GridCell"), { ssr: false });
const GridElement = dynamic(() => import("./GridElement"), { ssr: false });
const SimpleWater = dynamic(() => import("./SimpleWater"), { ssr: false });
const Sun = dynamic(() => import("./Sun"), { ssr: false });

/**
 * Main 3D scene component for the pontoon configurator
 */
function Scene({
  gridSize,
  waterLevel,
  elements,
  gridElements,
  isPerspective,
  currentLevel,
  levelHeight,
}) {
  // Adjust gridElements positions to be at base level (y=0)
  const adjustedGridElements = gridElements.map(({ position, ...rest }) => ({
    ...rest,
    position: [position[0], 0, position[2]], // Reset Y to 0 as group will handle height
  }));

  return (
    <Canvas
      className="w-full h-full"
      style={{ background: COLORS.SKY }}
      camera={{ position: [0, 5, 10], fov: 75 }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color(COLORS.SKY));
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.8;
      }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.7} color="#0000ff" />
        <Sun position={[10, 10, 10]} />
        <directionalLight
          position={[-10, 10, -10]}
          intensity={1.6}
          color="#E1F2FF"
        />
        {isPerspective ? (
          <PerspectiveCamera makeDefault position={[10, 10, 10]} />
        ) : (
          <OrthographicCamera makeDefault position={[0, 10, 0]} zoom={30} />
        )}
        <OrbitControls enabled={isPerspective} />

        {/* Only render grid and cells for current level */}
        <group position={[0, currentLevel * levelHeight, 0]}>
          <Grid size={gridSize} />
          {adjustedGridElements.map(({ key, ...props }) => (
            <GridCell
              key={key}
              {...props}
              currentLevel={currentLevel}
              levelHeight={levelHeight}
            />
          ))}
        </group>

        {/* Render all elements with appropriate opacity */}
        {elements.map((element, index) => (
          <GridElement
            key={index}
            position={element.position}
            type={element.type}
            waterLevel={waterLevel}
            opacity={element.isCurrentLevel ? 1 : 0.3}
          />
        ))}

        <SimpleWater position={[0, waterLevel, 0]} />
      </Suspense>
    </Canvas>
  );
}

// Memoize the Scene component to prevent unnecessary re-renders
export default memo(Scene);
