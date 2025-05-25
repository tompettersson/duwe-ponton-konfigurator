"use client";

import { useEffect, useRef } from "react";
import { extend, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Water } from "three-stdlib";

extend({ Water });

/**
 * WaterPlane – realistic water surface with reflections.
 * Uses the three-stdlib Water shader with optimized settings.
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
      sunDirection: new THREE.Vector3(0.2, 1.0, 0.3),
      sunColor: 0xffffff,
      waterColor: 0x3d9dcc,
      distortionScale: 0.3,
      fog: scene.fog !== undefined,
      format: THREE.RGBAFormat,
    });

    water.rotation.x = -Math.PI / 2;
    water.position.set(0, y, 0);
    water.material.transparent = true;
    water.material.opacity = 0.8;
    water.material.depthWrite = false;


    scene.add(water);
    waterRef.current = water;

    return () => {
      scene.remove(water);
      water.geometry.dispose();
      water.material.dispose();
      if (normals) normals.dispose();
    };
  }, [scene, width, depth, y]);

  // Animate water time uniform
  useFrame((_, delta) => {
    if (waterRef.current) {
      waterRef.current.material.uniforms.time.value += delta * 0.5;
    }
  });

  return null; // Rendered directly in the scene
}
