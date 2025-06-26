/**
 * HistoryService - Operation-based Undo/Redo System
 * 
 * Provides sophisticated history management with operation tracking
 * Supports compound operations and selective undo/redo
 */

import { Grid } from '../domain';
import { Operation } from './ConfiguratorService';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  gridBefore: Grid;
  gridAfter: Grid;
  operations: Operation[];
  metadata: {
    operationType: string;
    affectedPontoons: string[];
    userDescription?: string;
  };
}

export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number; // -1 means no history, 0 means at first entry
  maxSize: number;
}

export interface HistoryStats {
  totalEntries: number;
  currentPosition: number;
  canUndo: boolean;
  canRedo: boolean;
  memoryUsageBytes: number;
}

export class HistoryService {
  private history: HistoryState;

  constructor(maxSize: number = 50) {
    this.history = {
      entries: [],
      currentIndex: -1,
      maxSize
    };
  }

  /**
   * Add new history entry
   */
  addEntry(
    gridBefore: Grid,
    gridAfter: Grid,
    operations: Operation[],
    description: string,
    userDescription?: string
  ): void {
    // Create history entry
    const entry: HistoryEntry = {
      id: this.generateEntryId(),
      timestamp: Date.now(),
      description,
      gridBefore,
      gridAfter,
      operations: [...operations], // Defensive copy
      metadata: {
        operationType: operations[0]?.type || 'UNKNOWN',
        affectedPontoons: this.extractAffectedPontoons(operations),
        userDescription
      }
    };

    // Remove any future entries if we're not at the end
    if (this.history.currentIndex < this.history.entries.length - 1) {
      this.history.entries = this.history.entries.slice(0, this.history.currentIndex + 1);
    }

    // Add new entry
    this.history.entries.push(entry);
    this.history.currentIndex = this.history.entries.length - 1;

    // Trim history if too large
    this.trimHistory();

    console.log(`📚 History: Added entry "${description}" (${this.history.entries.length} total)`);
  }

  /**
   * Undo last operation
   */
  undo(): Grid | null {
    if (!this.canUndo()) {
      console.warn('📚 History: Cannot undo - no previous entries');
      return null;
    }

    const currentEntry = this.history.entries[this.history.currentIndex];
    this.history.currentIndex--;

    console.log(`↶ History: Undid "${currentEntry.description}"`);
    return currentEntry.gridBefore;
  }

  /**
   * Redo next operation
   */
  redo(): Grid | null {
    if (!this.canRedo()) {
      console.warn('📚 History: Cannot redo - no future entries');
      return null;
    }

    this.history.currentIndex++;
    const nextEntry = this.history.entries[this.history.currentIndex];

    console.log(`↷ History: Redid "${nextEntry.description}"`);
    return nextEntry.gridAfter;
  }

  /**
   * Check if undo is possible
   */
  canUndo(): boolean {
    return this.history.currentIndex >= 0;
  }

  /**
   * Check if redo is possible
   */
  canRedo(): boolean {
    return this.history.currentIndex < this.history.entries.length - 1;
  }

  /**
   * Get current grid state
   */
  getCurrentGrid(): Grid | null {
    if (this.history.currentIndex < 0) {
      return null;
    }
    return this.history.entries[this.history.currentIndex].gridAfter;
  }

  /**
   * Get history entry at index
   */
  getEntry(index: number): HistoryEntry | null {
    if (index < 0 || index >= this.history.entries.length) {
      return null;
    }
    return this.history.entries[index];
  }

  /**
   * Get all history entries for UI display
   */
  getEntries(): HistoryEntry[] {
    return [...this.history.entries]; // Defensive copy
  }

  /**
   * Get history statistics
   */
  getStats(): HistoryStats {
    const memoryUsage = this.estimateMemoryUsage();

    return {
      totalEntries: this.history.entries.length,
      currentPosition: this.history.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      memoryUsageBytes: memoryUsage
    };
  }

  /**
   * Jump to specific history entry
   */
  jumpToEntry(index: number): Grid | null {
    if (index < 0 || index >= this.history.entries.length) {
      console.warn(`📚 History: Invalid index ${index}`);
      return null;
    }

    this.history.currentIndex = index;
    const entry = this.history.entries[index];

    console.log(`🎯 History: Jumped to "${entry.description}"`);
    return entry.gridAfter;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history.entries = [];
    this.history.currentIndex = -1;
    console.log('🗑️ History: Cleared all entries');
  }

  /**
   * Get recent entries for quick access
   */
  getRecentEntries(count: number = 10): HistoryEntry[] {
    const startIndex = Math.max(0, this.history.entries.length - count);
    return this.history.entries.slice(startIndex);
  }

  /**
   * Search history entries by description
   */
  searchEntries(query: string): HistoryEntry[] {
    const lowercaseQuery = query.toLowerCase();
    return this.history.entries.filter(entry =>
      entry.description.toLowerCase().includes(lowercaseQuery) ||
      (entry.metadata.userDescription?.toLowerCase().includes(lowercaseQuery) ?? false)
    );
  }

  /**
   * Get entries by operation type
   */
  getEntriesByType(operationType: string): HistoryEntry[] {
    return this.history.entries.filter(entry =>
      entry.metadata.operationType === operationType
    );
  }

  /**
   * Get entries affecting specific pontoon
   */
  getEntriesAffectingPontoon(pontoonId: string): HistoryEntry[] {
    return this.history.entries.filter(entry =>
      entry.metadata.affectedPontoons.includes(pontoonId)
    );
  }

  /**
   * Create checkpoint for complex operations
   */
  createCheckpoint(grid: Grid, description: string): string {
    const checkpointId = this.generateEntryId();
    
    // Add special checkpoint entry
    const entry: HistoryEntry = {
      id: checkpointId,
      timestamp: Date.now(),
      description: `Checkpoint: ${description}`,
      gridBefore: grid,
      gridAfter: grid,
      operations: [],
      metadata: {
        operationType: 'CHECKPOINT',
        affectedPontoons: [],
        userDescription: description
      }
    };

    this.history.entries.push(entry);
    this.history.currentIndex = this.history.entries.length - 1;
    this.trimHistory();

    console.log(`🏁 History: Created checkpoint "${description}"`);
    return checkpointId;
  }

  /**
   * Rollback to checkpoint
   */
  rollbackToCheckpoint(checkpointId: string): Grid | null {
    const entryIndex = this.history.entries.findIndex(entry => entry.id === checkpointId);
    
    if (entryIndex === -1) {
      console.warn(`📚 History: Checkpoint ${checkpointId} not found`);
      return null;
    }

    return this.jumpToEntry(entryIndex);
  }

  /**
   * Compress history by removing intermediate steps
   */
  compressHistory(keepEveryNth: number = 3): void {
    if (this.history.entries.length <= keepEveryNth) {
      return;
    }

    const compressed: HistoryEntry[] = [];
    
    // Keep first entry
    if (this.history.entries.length > 0) {
      compressed.push(this.history.entries[0]);
    }

    // Keep every nth entry
    for (let i = keepEveryNth; i < this.history.entries.length; i += keepEveryNth) {
      compressed.push(this.history.entries[i]);
    }

    // Always keep the last entry
    const lastEntry = this.history.entries[this.history.entries.length - 1];
    if (compressed[compressed.length - 1] !== lastEntry) {
      compressed.push(lastEntry);
    }

    // Update history
    const oldLength = this.history.entries.length;
    this.history.entries = compressed;
    this.history.currentIndex = Math.min(this.history.currentIndex, compressed.length - 1);

    console.log(`🗜️ History: Compressed from ${oldLength} to ${compressed.length} entries`);
  }

  /**
   * Export history for analysis or backup
   */
  exportHistory(): {
    metadata: {
      exportTime: string;
      totalEntries: number;
      currentIndex: number;
    };
    entries: Array<{
      id: string;
      timestamp: string;
      description: string;
      operationType: string;
      affectedPontoons: string[];
      userDescription?: string;
    }>;
  } {
    return {
      metadata: {
        exportTime: new Date().toISOString(),
        totalEntries: this.history.entries.length,
        currentIndex: this.history.currentIndex
      },
      entries: this.history.entries.map(entry => ({
        id: entry.id,
        timestamp: new Date(entry.timestamp).toISOString(),
        description: entry.description,
        operationType: entry.metadata.operationType,
        affectedPontoons: entry.metadata.affectedPontoons,
        userDescription: entry.metadata.userDescription
      }))
    };
  }

  /**
   * Trim history to maximum size
   */
  private trimHistory(): void {
    if (this.history.entries.length <= this.history.maxSize) {
      return;
    }

    const excessCount = this.history.entries.length - this.history.maxSize;
    this.history.entries = this.history.entries.slice(excessCount);
    this.history.currentIndex = Math.max(0, this.history.currentIndex - excessCount);

    console.log(`✂️ History: Trimmed ${excessCount} old entries`);
  }

  /**
   * Extract affected pontoon IDs from operations
   */
  private extractAffectedPontoons(operations: Operation[]): string[] {
    const pontoonIds = new Set<string>();

    for (const operation of operations) {
      if (operation.data.pontoonId) {
        pontoonIds.add(operation.data.pontoonId);
      }
      if (operation.data.pontoonIds) {
        operation.data.pontoonIds.forEach((id: string) => pontoonIds.add(id));
      }
    }

    return Array.from(pontoonIds);
  }

  /**
   * Estimate memory usage of history
   */
  private estimateMemoryUsage(): number {
    // Rough estimation in bytes
    let totalSize = 0;

    for (const entry of this.history.entries) {
      // Base entry overhead
      totalSize += 200;
      
      // Grid data (pontoons count * average size)
      totalSize += entry.gridBefore.getPontoonCount() * 100;
      totalSize += entry.gridAfter.getPontoonCount() * 100;
      
      // Operations data
      totalSize += entry.operations.length * 50;
      
      // String data
      totalSize += entry.description.length * 2;
      if (entry.metadata.userDescription) {
        totalSize += entry.metadata.userDescription.length * 2;
      }
    }

    return totalSize;
  }

  /**
   * Generate unique entry ID
   */
  private generateEntryId(): string {
    return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}