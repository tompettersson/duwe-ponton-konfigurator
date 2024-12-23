import React from "react";
import { Sky } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

const Sun = ({ position }) => {
  const { scene } = useThree();

  React.useEffect(() => {
    // Make fog lighter and more subtle
    scene.fog = new THREE.FogExp2("#E6F3FF", 0.0005);

    return () => {
      scene.fog = null;
    };
  }, [scene]);

  return (
    <>
      <Sky
        distance={450000}
        sunPosition={position}
        inclination={0.48}
        intensity={0.4}
        azimuth={0.25}
        mieCoefficient={0.0003}
        mieDirectionalG={0.95}
        rayleigh={1.2}
        turbidity={0.1}
      />
      <directionalLight
        position={position}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
    </>
  );
};

export default Sun;
