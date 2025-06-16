/**
 * InteractionManager - Precise Mouse/Touch Interaction
 * 
 * Handles raycasting and tool interactions with mathematical precision
 * Converts screen coordinates to exact grid positions
 */

'use client';

import { useEffect, useRef } from 'react';
import * as React from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useConfiguratorStore } from '../../store/configuratorStore';
import { useDebugStore } from '../../store/debugStore';
import { LAYERS } from '../../lib/constants';
import type { GridPosition, PreciseGridPosition } from '../../types';

export function InteractionManager() {
  const { camera, gl, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());

  const {
    selectedTool,
    currentPontoonType,
    currentPontoonColor, // FIX: Add missing color import
    currentLevel,
    addPontoon,
    removePontoon,
    selectPontoon,
    clearSelection,
    setHoveredCell,
    deleteSelected,
    undo,
    redo,
    gridMath,
    getPontoonAt,
    gridSize,
    // Multi-Drop
    isDragging,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    // FIX: Add safe tool switching function
    safeSetTool,
    // Tool state snapshot functions
    snapshotToolState,
    clearToolStateSnapshot,
  } = useConfiguratorStore();

  // Debug store
  const { setIntersectCount, setRaycastCoords, setLastClickResult } = useDebugStore();

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      // Calculate normalized device coordinates
      const rect = gl.domElement.getBoundingClientRect();
      pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update debug info
      setRaycastCoords({x: pointer.current.x, y: pointer.current.y});

      // Perform raycasting
      raycaster.current.setFromCamera(pointer.current, camera);
      raycaster.current.layers.set(LAYERS.GRID);

      const intersects = raycaster.current.intersectObjects(scene.children);
      setIntersectCount(intersects.length);

      if (intersects.length > 0) {
        const intersection = intersects.find(hit => hit.object.userData.isGround);
        if (intersection) {
          // Convert world position to precise grid coordinates with sub-cell positioning
          const preciseGridPos = gridMath.worldToPreciseGrid(intersection.point, currentLevel, gridSize);
          const gridPos: GridPosition = {
            x: preciseGridPos.x,
            y: preciseGridPos.y,
            z: preciseGridPos.z
          };
          
          // DEBUG: Log the conversion process
          console.log('🔍 HOVER DEBUG:', {
            intersectionY: intersection.point.y,
            currentLevel,
            preciseGridPosY: preciseGridPos.y,
            finalGridPosY: gridPos.y,
            gridPosition: gridPos
          });
          
          // Handle multi-drop drag update
          if (selectedTool === 'multi-drop' && isDragging) {
            const mousePos = {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top
            };
            updateDrag(gridPos, mousePos);
          } else {
            setHoveredCell(gridPos, preciseGridPos);
          }
        } else {
          // Check what other objects were hit (for debugging)
          if (intersects.length > 0) {
            console.log('🎯 Non-ground intersection:', intersects[0].object.userData, 'at Y:', intersects[0].point.y);
          }
          if (selectedTool !== 'multi-drop' || !isDragging) {
            setHoveredCell(null);
          }
        }
      } else {
        if (selectedTool !== 'multi-drop' || !isDragging) {
          setHoveredCell(null);
        }
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return; // Left click only

      raycaster.current.setFromCamera(pointer.current, camera);

      // First, check for pontoon clicks
      raycaster.current.layers.set(LAYERS.PONTOONS);
      const pontoonIntersects = raycaster.current.intersectObjects(scene.children);

      if (pontoonIntersects.length > 0) {
        const object = pontoonIntersects[0].object;
        const pontoonId = object.userData.pontoonId;

        if (pontoonId) {
          handlePontoonClick(pontoonId, event);
          return;
        }
      }

      // SINGLE SOURCE OF TRUTH: Use hover state instead of duplicate raycast
      const currentHoveredCell = useConfiguratorStore.getState().hoveredCell;
      
      if (currentHoveredCell) {
        console.log('🎯 CLICK using hover state (Single Source of Truth):', currentHoveredCell);
        
        if (selectedTool === 'multi-drop') {
          handleMultiDropStart(currentHoveredCell, event);
        } else {
          handleGridClick(currentHoveredCell, event);
        }
      } else {
        console.log('❌ No hover cell available for click');
        // Fallback: Grid raycast only if no hover state (should be rare)
        raycaster.current.layers.set(LAYERS.GRID);
        const gridIntersects = raycaster.current.intersectObjects(scene.children);

        if (gridIntersects.length > 0) {
          const intersection = gridIntersects.find(hit => hit.object.userData.isGround);
          if (intersection) {
            const preciseGridPos = gridMath.worldToPreciseGrid(intersection.point, currentLevel, gridSize);
            const gridPos: GridPosition = {
              x: preciseGridPos.x,
              y: preciseGridPos.y,
              z: preciseGridPos.z
            };
            
            if (selectedTool === 'multi-drop') {
              handleMultiDropStart(gridPos, event);
            } else {
              handleGridClick(gridPos, event);
            }
          } else {
            console.log('❌ Fallback raycast: No ground intersection found');
          }
        } else {
          console.log('❌ Fallback raycast: No grid intersections found');
        }
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (event.button !== 0) return; // Left click only
      
      if (selectedTool === 'multi-drop' && isDragging) {
        endDrag();
      }
    };

    const handleMultiDropStart = (gridPos: GridPosition, event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const mousePos = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      // Create tool state snapshot for consistent multi-drop placement
      snapshotToolState();
      startDrag(gridPos, mousePos);
    };

    const handlePontoonClick = (pontoonId: string, event: MouseEvent) => {
      switch (selectedTool) {
        case 'select':
          selectPontoon(pontoonId, event.shiftKey);
          break;
          
        case 'delete':
          removePontoon(pontoonId);
          break;
          
        case 'rotate':
          // TODO: Implement rotation
          console.log('Rotate pontoon:', pontoonId);
          break;
          
        default:
          // For other tools, treat as selection
          selectPontoon(pontoonId, event.shiftKey);
          break;
      }
    };

    const handleGridClick = (gridPos: GridPosition, event: MouseEvent) => {
      // CRITICAL FIX: Capture currentLevel immediately to prevent state changes during processing
      const levelAtClickTime = currentLevel;
      
      console.log('🖱️ CLICK DEBUG:', {
        gridPos,
        currentLevel: levelAtClickTime,
        levelMatch: gridPos.y === levelAtClickTime,
        selectedTool
      });
      
      // Only allow interaction on current level
      if (gridPos.y !== levelAtClickTime) {
        console.log('❌ Level mismatch! Grid Y:', gridPos.y, 'Current Level:', levelAtClickTime);
        setLastClickResult('WRONG_LEVEL');
        return;
      }
      
      console.log('✅ Level check passed, processing click');
      console.log('🔧 Selected tool:', selectedTool);
      
      switch (selectedTool) {
        case 'place':
          console.log('🔨 Attempting to place pontoon at:', gridPos);
          // Create tool state snapshot for consistent placement
          snapshotToolState();
          const success = addPontoon(gridPos);
          // Clear snapshot after placement
          clearToolStateSnapshot();
          console.log('🔨 Place result:', success ? 'SUCCESS' : 'FAILED');
          setLastClickResult(success ? 'SUCCESS' : 'FAILED');
          break;
          
        case 'select':
          if (!event.shiftKey) {
            clearSelection();
          }
          break;
          
        case 'delete':
          const pontoon = getPontoonAt(gridPos);
          if (pontoon) {
            removePontoon(pontoon.id);
          }
          break;
          
        default:
          break;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent browser shortcuts when focus is on canvas
      if (document.activeElement === gl.domElement) {
        event.preventDefault();
      }

      switch (event.key) {
          
        case 'Delete':
        case 'Backspace':
          deleteSelected();
          break;
          
        case '1':
          useConfiguratorStore.getState().safeSetTool('select');
          break;
          
        case '2':
          useConfiguratorStore.getState().safeSetTool('place');
          break;
          
        case '3':
          useConfiguratorStore.getState().safeSetTool('delete');
          break;
          
        case '4':
          useConfiguratorStore.getState().safeSetTool('rotate');
          break;
          
        case '5':
          // FIX: Use atomic configuration and safe tool switching
          if (!useConfiguratorStore.getState().isDragging) {
            useConfiguratorStore.getState().setToolConfiguration({
              tool: 'multi-drop',
              pontoonType: 'double',
              viewMode: '2d'
            });
          }
          break;
          
        case 'a':
        case 'A':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            useConfiguratorStore.getState().selectAll();
          }
          break;
          
        case 'z':
        case 'Z':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (event.shiftKey) {
              redo();
            } else {
              undo();
            }
          }
          break;
          
        case 'Tab':
          event.preventDefault();
          // Cycle through view modes
          const currentMode = useConfiguratorStore.getState().viewMode;
          useConfiguratorStore.getState().setViewMode(currentMode === '2d' ? '3d' : '2d');
          break;
          
        case 'g':
        case 'G':
          // Toggle grid visibility
          const isVisible = useConfiguratorStore.getState().isGridVisible;
          useConfiguratorStore.getState().setGridVisible(!isVisible);
          break;
          
        case 'Escape':
          if (selectedTool === 'multi-drop' && isDragging) {
            cancelDrag();
          } else {
            clearSelection();
          }
          break;
          
        default:
          break;
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault(); // Disable right-click context menu
    };

    // Add event listeners
    gl.domElement.addEventListener('pointermove', handlePointerMove);
    gl.domElement.addEventListener('mousedown', handleMouseDown);
    gl.domElement.addEventListener('mouseup', handleMouseUp);
    gl.domElement.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    // Focus canvas for keyboard events
    gl.domElement.tabIndex = 0;
    gl.domElement.focus();

    return () => {
      gl.domElement.removeEventListener('pointermove', handlePointerMove);
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      gl.domElement.removeEventListener('mouseup', handleMouseUp);
      gl.domElement.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    camera, 
    gl, 
    scene, 
    selectedTool, 
    currentPontoonType,
    currentPontoonColor, // FIX: Add missing color dependency for correct closures
    currentLevel,
    addPontoon,
    removePontoon,
    selectPontoon,
    clearSelection,
    setHoveredCell,
    deleteSelected,
    undo,
    redo,
    gridMath,
    getPontoonAt,
    gridSize,
    // Multi-Drop dependencies
    isDragging,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag
  ]);

  return null; // This component doesn't render anything
}