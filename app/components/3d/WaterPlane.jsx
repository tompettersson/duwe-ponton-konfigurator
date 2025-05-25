"use client";

import { useEffect, useRef } from "react";
import { extend, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Water } from "three-stdlib";

extend({ Water });

/**
 * WaterPlane – realistic but lightweight water surface.
 * Uses the three-stdlib Water shader with minimal reflections.
 */
export default function WaterPlane({ width = 60, depth = 60, y = -0.5 }) {
  const waterRef = useRef();
  const { scene } = useThree();

  useEffect(() => {
    const geometry = new THREE.PlaneGeometry(width, depth, 1, 1);
    const textureLoader = new THREE.TextureLoader();
    const normals = textureLoader.load("/water/Water_1_M_Normal.jpg", (tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(width / 10, depth / 10); // tile normals
    });

    const water = new Water(geometry, {
      textureWidth: 1024,
      textureHeight: 1024,
      waterNormals: normals,
      sunDirection: new THREE.Vector3(0, 1, 0),
      sunColor: 0x000000, // Black sun to minimize reflections
      waterColor: 0x3d9dcc,
      distortionScale: 0.4, // Reduced distortion
      fog: scene.fog !== undefined,
      format: THREE.RGBAFormat,
    });

    water.rotation.x = -Math.PI / 2;
    water.position.set(0, y, 0);
    water.material.transparent = true;
    water.material.opacity = 0.7; // Make slightly less transparent
    water.material.depthWrite = false;

    // Minimize reflections/specular highlights
    water.material.metalness = 0;
    water.material.roughness = 1;
    water.material.envMap = null;
    water.material.envMapIntensity = 0;

    // Further reduce reflection contribution in shader
    water.material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        /#include <envmap_fragment>/g,
        "vec3 totalEnvMapRadiance = vec3(0.0);"
      );
    };

    scene.add(water);
    waterRef.current = water;

    return () => {
      scene.remove(water);
      water.geometry.dispose();
      water.material.dispose();
    };
  }, [scene, width, depth, y]);

  // Animate water time uniform
  useFrame((_, delta) => {
    if (waterRef.current) {
      waterRef.current.material.uniforms.time.value += delta * 0.3;
    }
  });

  return null; // Rendered directly in the scene
}
