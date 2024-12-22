"use client";

import React, { useState } from "react";
import GridElement from "./GridElement";

function GridCell({ position, onCellClick, selectedTool }) {
  const [hovered, setHovered] = useState(false);

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setHovered(true);
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    setHovered(false);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onCellClick(position);
  };

  return (
    <group>
      <mesh
        position={position}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {hovered && selectedTool === "singlePontoon" && (
        <GridElement position={position} opacity={0.5} />
      )}
      {hovered && selectedTool === "deleteTool" && (
        <GridElement position={position} opacity={0.5} color="red" />
      )}
    </group>
  );
}

export default GridCell;
