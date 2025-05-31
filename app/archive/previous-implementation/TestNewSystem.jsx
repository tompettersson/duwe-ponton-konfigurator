"use client";

import React, { useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import UniformPontoons, { PontoonPreview } from "./UniformPontoons.jsx";
import SimpleGridSystem from "./SimpleGridSystem.jsx";
import { PontoonElement } from "../../utils/PontoonElement.js";
import { CollisionDetection } from "../../utils/CollisionDetection.js";
import { BASE_UNIT } from "../../constants/units.js";

/**
 * Test Component für das neue unit-basierte System
 * Zeigt Single Pontoons als einfache Boxen mit perfektem Grid-Alignment
 */
export default function TestNewSystem() {
  const [elements, setElements] = useState([]);
  const [selectedTool, setSelectedTool] = useState('single');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [hoverPosition, setHoverPosition] = useState(null);
  const [collisionSystem] = useState(() => new CollisionDetection());

  const handleCellClick = useCallback((clickData) => {
    console.log('Cell clicked:', clickData);
    console.log('Selected tool:', selectedTool);
    
    const { gridX, gridZ, level } = clickData;
    
    if (selectedTool === 'eraser') {
      // Remove element at position
      const result = collisionSystem.removeElementAt(gridX, gridZ, level);
      if (result.success) {
        setElements([...collisionSystem.elements]);
        console.log('✅ Removed element:', result.element.id);
      } else {
        console.log('❌ No element to remove at position');
      }
      return;
    }

    // Try to place new element
    console.log('🔄 Attempting to place', selectedTool, 'at grid:', gridX, gridZ, 'level:', level);
    const placement = collisionSystem.canPlaceElement(selectedTool, gridX, gridZ, level);
    
    if (placement.canPlace) {
      const newElement = new PontoonElement(selectedTool, gridX, gridZ, level, 'blue');
      const result = collisionSystem.addElement(newElement);
      
      if (result.success) {
        setElements([...collisionSystem.elements]);
        console.log('✅ Placed element:', newElement.id, 'at grid:', gridX, gridZ, 'level:', level);
        console.log('📍 World position:', newElement.worldPosition);
        console.log('📏 Element dimensions:', newElement.physicalSize);
      } else {
        console.log('❌ Failed to add element:', result.reason);
      }
    } else {
      console.log('❌ Cannot place element:', placement.reason);
      if (placement.cell) {
        console.log('🚫 Problem at cell:', placement.cell);
      }
    }
  }, [selectedTool, collisionSystem]);

  const handleCellHover = useCallback((gridX, gridZ) => {
    setHoverPosition({ gridX, gridZ, level: currentLevel });
  }, [currentLevel]);

  const handleCellHoverEnd = useCallback(() => {
    setHoverPosition(null);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#1a1a1a' }}>
      {/* Controls */}
      <div style={{ 
        position: 'absolute', 
        top: 20, 
        left: 20, 
        zIndex: 10, 
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: '10px',
        borderRadius: '5px'
      }}>
        <h3>Neues Unit-System Test</h3>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Tool: </label>
          <select 
            value={selectedTool} 
            onChange={(e) => setSelectedTool(e.target.value)}
            style={{ marginLeft: '5px' }}
          >
            <option value="single">Single Pontoon</option>
            <option value="double">Double Pontoon</option>
            <option value="eraser">Eraser</option>
          </select>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Level: </label>
          <input 
            type="number" 
            value={currentLevel}
            onChange={(e) => setCurrentLevel(parseInt(e.target.value))}
            min="-1" 
            max="2"
            style={{ marginLeft: '5px', width: '50px' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Grid Size:</strong> {BASE_UNIT.width}m × {BASE_UNIT.depth}m<br/>
          <strong>Single:</strong> {BASE_UNIT.width}m × {BASE_UNIT.depth}m × {BASE_UNIT.height}m<br/>
          <strong>Double:</strong> {BASE_UNIT.width * 2}m × {BASE_UNIT.depth}m × {BASE_UNIT.height}m<br/>
          <strong>Elements:</strong> {elements.length}
        </div>

        <div style={{ fontSize: '12px', opacity: 0.7 }}>
          Click: Platziere/Entferne Pontoon<br/>
          Crosshairs = Verbindungspunkte<br/>
          Grid Cells = Pontoon-Größe
        </div>
      </div>

      {/* 3D Scene */}
      <Canvas
        camera={{ 
          position: [8, 8, 8], 
          fov: 50 
        }}
        style={{ background: 'linear-gradient(to bottom, #f0f0f0, #d0d0d0)' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        
        {/* Grid System */}
        <SimpleGridSystem
          onCellClick={handleCellClick}
          selectedTool={selectedTool}
          elements={elements}
          currentLevel={currentLevel}
          levelHeight={BASE_UNIT.height}
        />
        
        {/* Pontoon Elements */}
        <UniformPontoons 
          elements={elements}
          opacity={1}
        />
        
        {/* Hover Preview */}
        {hoverPosition && selectedTool !== 'eraser' && (
          <PontoonPreview
            type={selectedTool}
            gridX={hoverPosition.gridX}
            gridZ={hoverPosition.gridZ}
            level={hoverPosition.level}
            color="blue"
            opacity={0.5}
          />
        )}

        {/* Ground Plane für bessere Orientierung */}
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial 
            color="#2a2a2a" 
            transparent 
            opacity={0.3} 
          />
        </mesh>

        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  );
}