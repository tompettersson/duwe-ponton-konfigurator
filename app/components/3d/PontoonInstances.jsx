"use client";

import React, { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ELEMENT_TYPES, COLORS } from "../../constants/grid";

/**
 * PontoonInstances – efficient instanced rendering of single & double pontoons.
 * Accepts an array of elements with {position: [x,y,z], type}.
 */
function PontoonInstances({ elements = [], opacity = 1, color = null }) {
  // Split elements into single & double
  const singles = useMemo(
    () => elements.filter((e) => e.type !== ELEMENT_TYPES.DOUBLE),
    [elements]
  );
  const doubles = useMemo(
    () => elements.filter((e) => e.type === ELEMENT_TYPES.DOUBLE),
    [elements]
  );

  const singleMeshRef = useRef();
  const doubleMeshRef = useRef();

  // Helper to update matrices for an InstancedMesh
  const updateMatrices = (mesh, items, offset = 0) => {
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const scaleQuat = new THREE.Quaternion();
    items.forEach((el, idx) => {
      const pos = [el.position.x, el.position.y, el.position.z];
      if (offset) pos[0] += offset;
      matrix.compose(
        new THREE.Vector3(pos[0], pos[1], pos[2]),
        scaleQuat,
        new THREE.Vector3(1, 1, 1)
      );
      mesh.setMatrixAt(idx, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  // Update matrices whenever element arrays change
  useEffect(() => {
    updateMatrices(singleMeshRef.current, singles);
    // Disable raycast so grid cells receive pointer events
    if (singleMeshRef.current) singleMeshRef.current.raycast = () => {};
  }, [singles]);

  useEffect(() => {
    updateMatrices(doubleMeshRef.current, doubles, 0.5);
    if (doubleMeshRef.current) doubleMeshRef.current.raycast = () => {};
  }, [doubles]);

  // Determine material props
  const materialProps = useMemo(
    () => ({
      color: color || COLORS.PONTOON,
      transparent: opacity < 1,
      opacity,
      roughness: 0.3,
      metalness: 0.0,
      depthWrite: opacity >= 1,
      toneMapped: false,
    }),
    [opacity, color]
  );

  return (
    <>
      {singles.length > 0 && (
        <instancedMesh ref={singleMeshRef} args={[null, null, singles.length]}>
          <boxGeometry args={[0.96, 0.96, 0.96]} />
          <meshStandardMaterial attach="material" {...materialProps} />
        </instancedMesh>
      )}
      {doubles.length > 0 && (
        <instancedMesh ref={doubleMeshRef} args={[null, null, doubles.length]}>
          <boxGeometry args={[1.96, 0.96, 0.96]} />
          <meshStandardMaterial attach="material" {...materialProps} />
        </instancedMesh>
      )}
    </>
  );
}

export default memo(PontoonInstances);
