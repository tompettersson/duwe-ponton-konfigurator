/**
 * CameraController - Precise Camera Control for 2D/3D Views
 * 
 * Manages camera positioning with mathematical precision
 * Supports orthographic 2D and perspective 3D modes
 */

'use client';

import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CAMERA_POSITIONS } from '@/lib/constants';
import type { ViewMode } from '@/types';

interface CameraControllerProps {
  mode: ViewMode;
}

export function CameraController({ mode }: CameraControllerProps) {
  const { camera, size } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;
    const targetPosition = CAMERA_POSITIONS[mode.toUpperCase() as keyof typeof CAMERA_POSITIONS];

    if (mode === '2d') {
      // Top-down orthographic view
      camera.position.set(...targetPosition.position);
      camera.lookAt(...targetPosition.target);

      // Disable rotation for pure 2D experience
      controls.enableRotate = false;
      controls.enablePan = true;
      controls.enableZoom = true;

      // Set specific mouse controls for 2D
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };

      // Constrain camera movement to stay above the grid
      controls.maxPolarAngle = 0; // Lock to top-down view
      controls.minPolarAngle = 0;

      // Set zoom limits for 2D view
      controls.minDistance = 5;
      controls.maxDistance = 100;

    } else {
      // 3D perspective view
      camera.position.set(...targetPosition.position);
      camera.lookAt(...targetPosition.target);

      // Enable full 3D navigation
      controls.enableRotate = true;
      controls.enablePan = true;
      controls.enableZoom = true;

      // Standard 3D mouse controls
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };

      // Allow rotation but prevent going below ground
      controls.maxPolarAngle = Math.PI / 2 - 0.1; // Slightly above horizontal
      controls.minPolarAngle = 0;

      // Set zoom limits for 3D view
      controls.minDistance = 2;
      controls.maxDistance = 200;
    }

    // Update controls to apply changes
    controls.update();

  }, [mode, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      screenSpacePanning={false} // Pan in world space
      target={[0, 0, 0]} // Always look at origin
      
      // Smooth transitions
      enabledPanSpeed={1.0}
      zoomSpeed={1.0}
      rotateSpeed={1.0}
      
      // Touch controls for mobile
      enableTouch={true}
      touchAction="none"
      
      // Prevent accidental camera movement
      keyPanSpeed={10}
      keys={{
        LEFT: 'ArrowLeft',
        UP: 'ArrowUp', 
        RIGHT: 'ArrowRight',
        BOTTOM: 'ArrowDown'
      }}
    />
  );
}