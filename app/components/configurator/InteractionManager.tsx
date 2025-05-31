/**
 * InteractionManager - Precise Mouse/Touch Interaction
 * 
 * Handles raycasting and tool interactions with mathematical precision
 * Converts screen coordinates to exact grid positions
 */

'use client';

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useConfiguratorStore } from '@/store/configuratorStore';
import { LAYERS } from '@/lib/constants';

export function InteractionManager() {
  const { camera, gl, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());

  const {
    selectedTool,
    currentPontoonType,
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
  } = useConfiguratorStore();

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      // Calculate normalized device coordinates
      const rect = gl.domElement.getBoundingClientRect();
      pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Perform raycasting
      raycaster.current.setFromCamera(pointer.current, camera);
      raycaster.current.layers.set(LAYERS.GRID);

      const intersects = raycaster.current.intersectObjects(scene.children);

      if (intersects.length > 0) {
        const intersection = intersects.find(hit => hit.object.userData.isGround);
        if (intersection) {
          // Convert world position to precise grid coordinates
          const gridPos = gridMath.worldToGrid(intersection.point);
          setHoveredCell(gridPos);
        } else {
          setHoveredCell(null);
        }
      } else {
        setHoveredCell(null);
      }
    };

    const handleClick = (event: MouseEvent) => {
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

      // Then, check for grid clicks
      raycaster.current.layers.set(LAYERS.GRID);
      const gridIntersects = raycaster.current.intersectObjects(scene.children);

      if (gridIntersects.length > 0) {
        const intersection = gridIntersects.find(hit => hit.object.userData.isGround);
        if (intersection) {
          const gridPos = gridMath.worldToGrid(intersection.point);
          handleGridClick(gridPos, event);
        }
      }
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

    const handleGridClick = (gridPos: THREE.Vector3, event: MouseEvent) => {
      switch (selectedTool) {
        case 'place':
          const success = addPontoon(gridPos);
          if (!success) {
            console.warn('Cannot place pontoon at position:', gridPos);
          }
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
        case 'Escape':
          clearSelection();
          break;
          
        case 'Delete':
        case 'Backspace':
          deleteSelected();
          break;
          
        case '1':
          useConfiguratorStore.getState().setTool('select');
          break;
          
        case '2':
          useConfiguratorStore.getState().setTool('place');
          break;
          
        case '3':
          useConfiguratorStore.getState().setTool('delete');
          break;
          
        case '4':
          useConfiguratorStore.getState().setTool('rotate');
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
          
        default:
          break;
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault(); // Disable right-click context menu
    };

    // Add event listeners
    gl.domElement.addEventListener('pointermove', handlePointerMove);
    gl.domElement.addEventListener('click', handleClick);
    gl.domElement.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    // Focus canvas for keyboard events
    gl.domElement.tabIndex = 0;
    gl.domElement.focus();

    return () => {
      gl.domElement.removeEventListener('pointermove', handlePointerMove);
      gl.domElement.removeEventListener('click', handleClick);
      gl.domElement.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    camera, 
    gl, 
    scene, 
    selectedTool, 
    currentPontoonType,
    addPontoon,
    removePontoon,
    selectPontoon,
    clearSelection,
    setHoveredCell,
    deleteSelected,
    undo,
    redo,
    gridMath,
    getPontoonAt
  ]);

  return null; // This component doesn't render anything
}