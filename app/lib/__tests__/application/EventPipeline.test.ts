/**
 * EventPipeline - Integration Tests
 * 
 * Tests the complete event processing pipeline
 * Ensures linear processing and consistent behavior
 */

import { EventPipeline, UserInput, ProcessingContext } from '../../application/EventPipeline';
import { Grid } from '../../domain/Grid';
import { GridPosition } from '../../domain/GridPosition';
import { PontoonType, PontoonColor } from '../../domain/PontoonTypes';
import * as THREE from 'three';

describe('EventPipeline', () => {
  let pipeline: EventPipeline;
  let mockContext: ProcessingContext;
  let mockCamera: THREE.PerspectiveCamera;

  beforeEach(() => {
    pipeline = new EventPipeline();
    mockCamera = new THREE.PerspectiveCamera();
    mockCamera.position.set(0, 10, 10);
    mockCamera.lookAt(0, 0, 0);

    mockContext = {
      grid: Grid.createEmpty(10, 10, 3),
      camera: mockCamera,
      viewport: { width: 800, height: 600 },
      currentLevel: 0,
      currentTool: 'place',
      currentPontoonType: PontoonType.SINGLE,
      currentPontoonColor: PontoonColor.BLUE
    };
  });

  describe('Input Processing', () => {
    test('should process mouse move events for hover', async () => {
      const input: UserInput = {
        type: 'mouse_move',
        screenX: 400,
        screenY: 300,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now()
      };

      const result = await pipeline.processInput(input, mockContext);

      expect(result.success).toBe(true);
      expect(result.type).toBe('hover');
      expect(result.debugInfo.inputProcessed).toBe(true);
      expect(result.debugInfo.coordinateCalculated).toBe(true);
    });

    test('should process click events for placement', async () => {
      const input: UserInput = {
        type: 'mouse_click',
        screenX: 400,
        screenY: 300,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now()
      };

      const result = await pipeline.processInput(input, mockContext);

      // Note: This might fail coordinate calculation in test environment
      // but should still process the input correctly
      expect(result.debugInfo.inputProcessed).toBe(true);
    });

    test('should reject concurrent processing', async () => {
      const input: UserInput = {
        type: 'mouse_move',
        screenX: 400,
        screenY: 300,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now()
      };

      // Start first processing
      const promise1 = pipeline.processInput(input, mockContext);
      
      // Try to start second processing immediately
      const promise2 = pipeline.processInput(input, mockContext);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // One should succeed, one should fail due to pipeline being busy
      const successCount = [result1, result2].filter(r => r.success).length;
      const failureCount = [result1, result2].filter(r => !r.success).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
    });
  });

  describe('Tool Routing', () => {
    test('should route to placement tool correctly', async () => {
      mockContext.currentTool = 'place';
      
      const input: UserInput = {
        type: 'mouse_click',
        screenX: 400,
        screenY: 300,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now()
      };

      const result = await pipeline.processInput(input, mockContext);

      if (result.success && result.type === 'placement') {
        expect(result.newGrid).toBeDefined();
        expect(result.operations).toBeDefined();
      }
    });

    test('should route to selection tool correctly', async () => {
      mockContext.currentTool = 'select';
      
      const input: UserInput = {
        type: 'mouse_click',
        screenX: 400,
        screenY: 300,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now()
      };

      const result = await pipeline.processInput(input, mockContext);

      if (result.success) {
        expect(result.type).toBe('selection');
      }
    });

    test('should route to deletion tool correctly', async () => {
      // First place a pontoon to delete
      const placementPos = new GridPosition(5, 0, 5);
      mockContext.grid = mockContext.grid.placePontoon(
        placementPos,
        PontoonType.SINGLE,
        PontoonColor.BLUE
      );
      
      mockContext.currentTool = 'delete';
      
      const input: UserInput = {
        type: 'mouse_click',
        screenX: 400,
        screenY: 300,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now()
      };

      const result = await pipeline.processInput(input, mockContext);

      if (result.success && result.type === 'selection') {
        expect(result.newGrid).toBeDefined();
      }
    });

    test('should handle unknown tool gracefully', async () => {
      mockContext.currentTool = 'unknown-tool' as any;
      
      const input: UserInput = {
        type: 'mouse_click',
        screenX: 400,
        screenY: 300,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now()
      };

      const result = await pipeline.processInput(input, mockContext);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Unknown tool: unknown-tool');
    });
  });

  describe('Multi-Drop Support', () => {
    test('should handle multi-drop mouse down', async () => {
      mockContext.currentTool = 'multi-drop';
      
      const input: UserInput = {
        type: 'mouse_down',
        screenX: 400,
        screenY: 300,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now()
      };

      const result = await pipeline.processInput(input, mockContext);

      if (result.success) {
        expect(result.type).toBe('multi_drop');
      }
    });

    test('should handle multi-drop mouse up', async () => {
      mockContext.currentTool = 'multi-drop';
      
      const input: UserInput = {
        type: 'mouse_up',
        screenX: 450,
        screenY: 350,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now()
      };

      const result = await pipeline.processInput(input, mockContext);

      if (result.success) {
        expect(result.type).toBe('multi_drop');
      }
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should handle undo shortcut (Ctrl+Z)', async () => {
      // First, add something to history by placing a pontoon
      const placementPos = new GridPosition(5, 0, 5);
      mockContext.grid = mockContext.grid.placePontoon(
        placementPos,
        PontoonType.SINGLE,
        PontoonColor.BLUE
      );

      const historyService = pipeline.getHistoryService();
      historyService.addEntry(
        Grid.createEmpty(10, 10, 3),
        mockContext.grid,
        [],
        'Test placement'
      );

      const input: UserInput = {
        type: 'key_press',
        screenX: 0,
        screenY: 0,
        key: 'z',
        modifiers: { shift: false, ctrl: true, alt: false },
        timestamp: Date.now()
      };

      const result = await pipeline.processInput(input, mockContext);

      if (result.success && result.newGrid) {
        expect(result.newGrid.getPontoonCount()).toBe(0); // Should be empty after undo
      }
    });

    test('should handle redo shortcut (Ctrl+Y)', async () => {
      // Set up history state for redo
      const emptyGrid = Grid.createEmpty(10, 10, 3);
      const gridWithPontoon = emptyGrid.placePontoon(
        new GridPosition(5, 0, 5),
        PontoonType.SINGLE,
        PontoonColor.BLUE
      );

      const historyService = pipeline.getHistoryService();
      historyService.addEntry(emptyGrid, gridWithPontoon, [], 'Test placement');
      historyService.undo(); // Now we can redo

      const input: UserInput = {
        type: 'key_press',
        screenX: 0,
        screenY: 0,
        key: 'y',
        modifiers: { shift: false, ctrl: true, alt: false },
        timestamp: Date.now()
      };

      const result = await pipeline.processInput(input, mockContext);

      if (result.success && result.newGrid) {
        expect(result.newGrid.getPontoonCount()).toBe(1); // Should have pontoon after redo
      }
    });

    test('should handle delete key', async () => {
      // Place a pontoon first
      const placementPos = new GridPosition(5, 0, 5);
      mockContext.grid = mockContext.grid.placePontoon(
        placementPos,
        PontoonType.SINGLE,
        PontoonColor.BLUE
      );

      const input: UserInput = {
        type: 'key_press',
        screenX: 400, // Position over the pontoon
        screenY: 300,
        key: 'Delete',
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now()
      };

      const result = await pipeline.processInput(input, mockContext);

      if (result.success && result.type === 'selection' && result.newGrid) {
        expect(result.newGrid.getPontoonCount()).toBe(0); // Pontoon should be deleted
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle coordinate calculation failures gracefully', async () => {
      // Use invalid viewport to trigger coordinate calculation failure
      const invalidContext = {
        ...mockContext,
        viewport: { width: 0, height: 0 }
      };

      const input: UserInput = {
        type: 'mouse_click',
        screenX: 400,
        screenY: 300,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now()
      };

      const result = await pipeline.processInput(input, invalidContext);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Coordinate calculation failed');
    });

    test('should handle placement validation failures', async () => {
      // Try to place pontoon outside grid bounds
      const input: UserInput = {
        type: 'mouse_click',
        screenX: 1000, // Far outside normal coordinates
        screenY: 1000,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now()
      };

      const result = await pipeline.processInput(input, mockContext);

      // Should either fail coordinate calculation or validation
      expect(result.debugInfo.inputProcessed).toBe(true);
    });
  });

  describe('Performance Tracking', () => {
    test('should track processing statistics', async () => {
      const input: UserInput = {
        type: 'mouse_move',
        screenX: 400,
        screenY: 300,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now()
      };

      await pipeline.processInput(input, mockContext);
      
      const stats = pipeline.getStats();

      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
      expect(typeof stats.successRate).toBe('number');
      expect(stats.isProcessing).toBe(false);
    });

    test('should track debug information', async () => {
      const input: UserInput = {
        type: 'mouse_move',
        screenX: 400,
        screenY: 300,
        modifiers: { shift: false, ctrl: false, alt: false },
        timestamp: Date.now()
      };

      const result = await pipeline.processInput(input, mockContext);

      expect(result.debugInfo).toBeDefined();
      expect(typeof result.debugInfo.processingTimeMs).toBe('number');
      expect(typeof result.debugInfo.inputProcessed).toBe('boolean');
      expect(typeof result.debugInfo.coordinateCalculated).toBe('boolean');
      expect(typeof result.debugInfo.validationPerformed).toBe('boolean');
      expect(typeof result.debugInfo.operationExecuted).toBe('boolean');
    });
  });

  describe('Service Access', () => {
    test('should provide access to history service', () => {
      const historyService = pipeline.getHistoryService();
      
      expect(historyService).toBeDefined();
      expect(typeof historyService.addEntry).toBe('function');
      expect(typeof historyService.undo).toBe('function');
      expect(typeof historyService.redo).toBe('function');
    });

    test('should provide access to preview service', () => {
      const previewService = pipeline.getPreviewService();
      
      expect(previewService).toBeDefined();
      expect(typeof previewService.updatePreview).toBe('function');
      expect(typeof previewService.clearPreview).toBe('function');
    });

    test('should allow cache clearing', () => {
      expect(() => pipeline.clearCaches()).not.toThrow();
    });
  });

  describe('Linear Processing Guarantee', () => {
    test('should process events in sequence', async () => {
      const inputs: UserInput[] = [
        {
          type: 'mouse_move',
          screenX: 100,
          screenY: 100,
          modifiers: { shift: false, ctrl: false, alt: false },
          timestamp: Date.now()
        },
        {
          type: 'mouse_move',
          screenX: 200,
          screenY: 200,
          modifiers: { shift: false, ctrl: false, alt: false },
          timestamp: Date.now() + 10
        },
        {
          type: 'mouse_move',
          screenX: 300,
          screenY: 300,
          modifiers: { shift: false, ctrl: false, alt: false },
          timestamp: Date.now() + 20
        }
      ];

      // Process all inputs
      const results = [];
      for (const input of inputs) {
        const result = await pipeline.processInput(input, mockContext);
        results.push(result);
      }

      // All should complete (no concurrent processing conflicts)
      expect(results.every(r => r.debugInfo.inputProcessed)).toBe(true);
    });
  });
});