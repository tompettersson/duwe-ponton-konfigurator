"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { extend, useThree, useFrame } from "@react-three/fiber";
import { Water } from "three-stdlib";

extend({ Water });

const WATER_CONFIG = {
  textureWidth: 4096,
  textureHeight: 4096,
  waterColor: 0x0050aa,
  distortionScale: 1,
  animationSpeed: 0.3,
};

const SimpleWater = () => {
  const waterRef = useRef();
  const { scene } = useThree();

  useEffect(() => {
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    const waterNormals = new THREE.TextureLoader().load(
      "/textures/water/Water_1_M_Normal.jpg",
      (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }
    );

    const water = new Water(waterGeometry, {
      textureWidth: WATER_CONFIG.textureWidth,
      textureHeight: WATER_CONFIG.textureHeight,
      waterNormals: waterNormals,
      sunDirection: new THREE.Vector3(),
      waterColor: WATER_CONFIG.waterColor,
      distortionScale: WATER_CONFIG.distortionScale,
      fog: scene.fog !== undefined,
    });

    // Disable reflections
    water.material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <envmap_fragment>`,
        ""
      );
    };

    water.material.transparent = true;
    water.material.opacity = 0.5;
    water.material.depthWrite = false;
    water.material.side = THREE.DoubleSide;

    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.45, 0);

    scene.add(water);
    waterRef.current = water;

    return () => {
      scene.remove(water);
      water.geometry.dispose();
      water.material.dispose();
    };
  }, [scene]);

  useFrame((state, delta) => {
    if (waterRef.current) {
      waterRef.current.material.uniforms["time"].value +=
        delta * WATER_CONFIG.animationSpeed;
    }
  });

  return null;
};

export default SimpleWater;
