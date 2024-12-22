import React from 'react';
import { Sky } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const Sun = ({ position }) => {
    const { scene } = useThree();

    React.useEffect(() => {
        // Add fog to the scene for a misty effect
        scene.fog = new THREE.FogExp2('#E7F8FF', 0.005);

        return () => {
            scene.fog = null;
        };
    }, [scene]);

    return (
        <>
            <Sky
                distance={450000}
                sunPosition={position}
                inclination={0.49}
                azimuth={0.25}
                mieCoefficient={0.005}
                mieDirectionalG={0.8}
                rayleigh={2}
                turbidity={10}
            />
            <directionalLight
                position={position}
                intensity={1.5}
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
