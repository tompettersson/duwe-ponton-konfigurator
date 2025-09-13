'use client';

import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { modelLoader } from '../lib/ui';

function ModelViewer() {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [info, setInfo] = useState<string>('Loading...');

  useEffect(() => {
    async function loadModel() {
      try {
        const modelInfo = await modelLoader.loadDoublePontoon();
        const scaleFactor = modelLoader.calculateScaleFactor(modelInfo, 1000);
        
        const instance = modelLoader.cloneModel(modelInfo);
        instance.scale.setScalar(scaleFactor);
        
        setModel(instance);
        setInfo(`
          Dimensions: ${modelInfo.dimensions.x.toFixed(0)}mm x ${modelInfo.dimensions.y.toFixed(0)}mm x ${modelInfo.dimensions.z.toFixed(0)}mm
          Scale Factor: ${scaleFactor.toFixed(3)}
          Target Width: 1000mm (2 grid cells)
        `);
      } catch (error) {
        setInfo(`Error: ${error}`);
      }
    }
    loadModel();
  }, []);

  return (
    <div className="w-full h-screen bg-gray-100">
      <div className="absolute top-4 left-4 bg-white p-4 rounded shadow-lg z-10">
        <h2 className="text-lg font-bold mb-2">3D Pontoon Model Test</h2>
        <pre className="text-xs whitespace-pre-wrap">{info}</pre>
      </div>
      
      <Canvas camera={{ position: [2, 2, 2], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        <OrbitControls />
        <gridHelper args={[10, 20, '#888', '#444']} />
        <axesHelper args={[5]} />
        
        {model && <primitive object={model} />}
        
        {/* Reference cube: 1x1x1 = 1 meter */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ff0000" opacity={0.3} transparent />
        </mesh>
      </Canvas>
    </div>
  );
}

export default function Test3DModelPage() {
  return <ModelViewer />;
}