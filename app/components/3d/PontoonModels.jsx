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
function OBJModel({ elements, opacity, color }) {
  // ONLY load the one model we know works: the double pontoon
  const doubleMaterials = useLoader(MTLLoader, "/3d/fc/Ponton.mtl");
  doubleMaterials.preload();
  
  // Load ONLY the double pontoon model
  const doublePontoonObj = useLoader(OBJLoader, "/3d/fc/Ponton.obj", (loader) => {
    loader.setMaterials(doubleMaterials);
  });

  // ANALYSIS PHASE: Focus ONLY on the double pontoon model
  const { pontoonScale } = useMemo(() => {
    let doubleDimensions = null;
    
    if (doublePontoonObj) {
      const doubleBox = new THREE.Box3().setFromObject(doublePontoonObj);
      doubleDimensions = doubleBox.getSize(new THREE.Vector3());
      
      // Also get the center and bounds to understand the geometry better
      const center = doubleBox.getCenter(new THREE.Vector3());
      const min = doubleBox.min;
      const max = doubleBox.max;
      
      console.log("GEOMETRY ANALYSIS:");
      console.log("- Bounding box min:", min.x.toFixed(2), min.y.toFixed(2), min.z.toFixed(2));
      console.log("- Bounding box max:", max.x.toFixed(2), max.y.toFixed(2), max.z.toFixed(2));
      console.log("- Center point:", center.x.toFixed(2), center.y.toFixed(2), center.z.toFixed(2));
      console.log("- Size X (length):", doubleDimensions.x.toFixed(2));
      console.log("- Size Y (height):", doubleDimensions.y.toFixed(2)); 
      console.log("- Size Z (width):", doubleDimensions.z.toFixed(2));
      
      // Check if model is centered at origin
      const isCentered = Math.abs(center.x) < 1 && Math.abs(center.y) < 1 && Math.abs(center.z) < 1;
      console.log("- Model centered at origin:", isCentered ? "YES" : "NO");
      
      // Try to guess the model's intent
      const aspectRatio = doubleDimensions.x / doubleDimensions.z;
      console.log("- Aspect ratio (length/width):", aspectRatio.toFixed(2));
      
      if (aspectRatio > 1.5) {
        console.log("- LIKELY: This is a double/long pontoon (X is length)");
      } else if (aspectRatio < 0.7) {
        console.log("- LIKELY: Model is rotated or Z is length");
      } else {
        console.log("- LIKELY: This might be a square/single pontoon");
      }
    }
    
    // Current scaling and grid info
    const currentScale = 0.001;
    const gridSpacing = 0.8; // meters
    
    console.log("=== PONTOON SIZING ANALYSIS ===");
    
    if (doubleDimensions) {
      const currentSizeInScene = doubleDimensions.x * currentScale;
      console.log("Double pontoon analysis:");
      console.log("- Original model size (mm):", doubleDimensions.x.toFixed(0));
      console.log("- Current scale factor:", currentScale);
      console.log("- Current size in scene (m):", currentSizeInScene.toFixed(3));
      console.log("- Grid spacing (m):", gridSpacing);
      console.log("- Ratio (pontoon/grid):", (currentSizeInScene / gridSpacing).toFixed(2));
      console.log("- PROBLEM:", currentSizeInScene < gridSpacing ? "Pontoon smaller than grid!" : "OK");
      
      // Calculate what scale we need for pontoon to be larger than grid
      const targetPontoonSize = gridSpacing * 1.25; // 25% larger than grid
      const neededScale = targetPontoonSize / doubleDimensions.x;
      
      console.log("Recommended scaling:");
      console.log("- Target pontoon size (m):", targetPontoonSize.toFixed(3));
      console.log("- Needed scale factor:", neededScale.toFixed(6));
      console.log("- This would make pontoon:", (neededScale * doubleDimensions.x).toFixed(3) + "m");
    }
    
    console.log("=================================");
    
    // Simple: Double pontoon = 1.0m long (exactly 2 grid cells of 0.5m each)
    let pontoonScale = 0.001; // fallback
    
    if (doubleDimensions) {
      const targetSize = 1.096; // 1.096 meters - slightly larger to align connection holes with crosshairs
      pontoonScale = targetSize / doubleDimensions.x;
      
      console.log("DOUBLE PONTOON SCALING:");
      console.log("- Model size:", doubleDimensions.x.toFixed(0) + "mm");
      console.log("- Target size:", targetSize + "m (slightly larger for hole alignment)"); 
      console.log("- Scale factor:", pontoonScale.toFixed(6));
      console.log("- Result:", (pontoonScale * doubleDimensions.x).toFixed(3) + "m");
    }
    
    return { pontoonScale };
  }, [doublePontoonObj]);

  // Apply materials, opacity, and color overrides  
  useMemo(() => {
    if (doublePontoonObj) {
      doublePontoonObj.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = opacity < 1;
          child.material.opacity = opacity;
          
          // Override color if specified (for different levels)
          if (color) {
            child.material.color.set(color);
          }
        }
      });
    }
  }, [doublePontoonObj, opacity, color]);

  // This component now ONLY handles double pontoons
  const doubles = elements.filter(el => el.type === ELEMENT_TYPES.DOUBLE);

  return (
    <group>
      {/* ONLY double pontoons - singles are handled by PontoonInstances */}
      {doubles.map((element) => {
        // Position the double pontoon to align exactly with the hover preview
        // Back to what was working - only X axis adjustment
        const modelOffset = { x: 6.87, y: -14.75, z: 7.39 }; // Reverse the model's off-center origin
        const position = [
          element.position.x + 0.24 + (modelOffset.x * pontoonScale), // Move right (+0.24)
          element.position.y + (modelOffset.y * pontoonScale), 
          element.position.z + (modelOffset.z * pontoonScale)  // Z axis back to original
        ];
        const clonedObj = doublePontoonObj.clone();
        // Apply element-specific color
        if (element.color) {
          clonedObj.traverse((child) => {
            if (child.isMesh && child.material) {
              child.material = child.material.clone();
              child.material.color.set(element.color);
            }
          });
        }
        return (
          <primitive
            key={element.id}
            object={clonedObj}
            position={position}
            scale={[pontoonScale, pontoonScale, pontoonScale]}
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
          position={[
            element.position.x + (element.type === ELEMENT_TYPES.DOUBLE ? 1.0 : 0.5), 
            element.position.y, 
            element.position.z + 0.5
          ]}
        >
          <boxGeometry args={element.type === ELEMENT_TYPES.DOUBLE ? [2.0, 0.96, 1.0] : [1.0, 0.96, 1.0]} />
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
function PontoonModels({ elements = [], opacity = 1, color = null }) {
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
      {/* Model type switcher for testing - removed to clean up scene */}

      {/* Load different model types with error boundaries */}
      <Suspense fallback={<FallbackBoxes elements={allElements} opacity={opacity} />}>
        {modelType === "obj" && (
          <OBJModel elements={allElements} opacity={opacity} color={color} />
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