import React from 'react';
import { RoundedBox } from '@react-three/drei';

function GridElement({ position }) {
    return (
        <RoundedBox args={[0.96, 0.96, 0.96]} radius={0.1} smoothness={4} position={position}>
            <meshPhysicalMaterial
                attach="material"
                color="#6D9FFF"
                roughness={0.5} // Slightly rough surface for matte appearance
                metalness={0.1} // Low metalness for a plastic look
                clearcoat={0.3} // Clearcoat to add slight shininess
                clearcoatRoughness={0.25} // Roughness of the clearcoat
            />
        </RoundedBox>
    );
}

export default GridElement;
