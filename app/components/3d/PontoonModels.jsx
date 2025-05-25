"use client";

import React, { memo, useMemo, useState, Suspense } from "react";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";
import { ELEMENT_TYPES, COLORS } from "../../constants/grid";

/**
 * Model loader components for different formats
 */
function OBJModel({ elements, opacity }) {
  // Load MTL materials first
  const materials = useLoader(MTLLoader, "/3d/fc/Ponton.mtl");
  materials.preload();
  
  // Load OBJ with materials
  const obj = useLoader(OBJLoader, "/3d/fc/Ponton.obj", (loader) => {
    loader.setMaterials(materials);
  });

  return (
    <group>
      {elements.map((element) => {
        const position = [element.position.x, element.position.y, element.position.z];
        const isDouble = element.type === ELEMENT_TYPES.DOUBLE;
        if (isDouble) position[0] += 0.5;

        return (
          <primitive
            key={element.id}
            object={obj.clone()}
            position={position}
            scale={isDouble ? [2, 1, 1] : [1, 1, 1]}
          />
        );
      })}
    </group>
  );
}

function FBXModel({ elements, opacity, modelPath }) {
  const fbx = useLoader(FBXLoader, modelPath);

  return (
    <group>
      {elements.map((element) => {
        const position = [element.position.x, element.position.y, element.position.z];
        const isDouble = element.type === ELEMENT_TYPES.DOUBLE;
        if (isDouble) position[0] += 0.5;

        return (
          <primitive
            key={element.id}
            object={fbx.clone()}
            position={position}
            scale={isDouble ? [2, 1, 1] : [1, 1, 1]}
          />
        );
      })}
    </group>
  );
}

function FallbackBoxes({ elements, opacity }) {
  return (
    <group>
      {elements.map((element) => (
        <mesh
          key={element.id}
          position={[element.position.x, element.position.y, element.position.z]}
        >
          <boxGeometry args={element.type === ELEMENT_TYPES.DOUBLE ? [1.96, 0.96, 0.96] : [0.96, 0.96, 0.96]} />
          <meshStandardMaterial 
            color={COLORS.PONTOON} 
            transparent={opacity < 1}
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * PontoonModels – loads and renders real 3D pontoon models.
 * Tests different model formats to find the best ones.
 */
function PontoonModels({ elements = [], opacity = 1 }) {
  const [modelType, setModelType] = useState("obj"); // "obj", "fbx", "fbx2"
  
  // Split elements into single & double
  const singles = useMemo(
    () => elements.filter((e) => e.type !== ELEMENT_TYPES.DOUBLE),
    [elements]
  );
  const doubles = useMemo(
    () => elements.filter((e) => e.type === ELEMENT_TYPES.DOUBLE),
    [elements]
  );

  const allElements = [...singles, ...doubles];

  return (
    <group>
      {/* Model type switcher for testing */}
      {process.env.NODE_ENV === "development" && allElements.length > 0 && (
        <mesh 
          position={[5, 3, 0]}
          onClick={() => {
            const types = ["fallback", "obj", "fbx", "fbx2"];
            const currentIndex = types.indexOf(modelType);
            const nextIndex = (currentIndex + 1) % types.length;
            setModelType(types[nextIndex]);
            // console.log("Switching to model type:", types[nextIndex]);
          }}
        >
          <boxGeometry args={[1, 0.5, 0.5]} />
          <meshBasicMaterial color="orange" />
        </mesh>
      )}

      {/* Load different model types with error boundaries */}
      <Suspense fallback={<FallbackBoxes elements={allElements} opacity={opacity} />}>
        {modelType === "obj" && (
          <OBJModel elements={allElements} opacity={opacity} />
        )}
        {modelType === "fbx" && (
          <FBXModel elements={allElements} opacity={opacity} modelPath="/3d/neu/Ponton.fbx" />
        )}
        {modelType === "fbx2" && (
          <FBXModel elements={allElements} opacity={opacity} modelPath="/3d/neu/Ponton2.fbx" />
        )}
        {modelType === "fallback" && (
          <FallbackBoxes elements={allElements} opacity={opacity} />
        )}
      </Suspense>
    </group>
  );
}

export default memo(PontoonModels);