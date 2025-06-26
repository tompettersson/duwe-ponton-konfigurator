/**
 * Application Layer - Index
 * 
 * Clean exports for all application services
 * Provides orchestration layer between domain and UI
 */

// Core Services
export { ConfiguratorService } from './ConfiguratorService';
export { PreviewService } from './PreviewService';
export { HistoryService } from './HistoryService';
export { EventPipeline } from './EventPipeline';

// Types and Interfaces
export type {
  Operation,
  OperationResult,
  MultiPlacementOptions,
  BatchOperationResult
} from './ConfiguratorService';

export type {
  PreviewState,
  MultiPreviewState,
  HoverFeedback
} from './PreviewService';

export type {
  HistoryEntry,
  HistoryState,
  HistoryStats
} from './HistoryService';

export type {
  UserInput,
  ProcessingContext,
  ProcessingResult
} from './EventPipeline';

// Re-export common application constants
export const APPLICATION_CONSTANTS = {
  DEFAULT_HISTORY_SIZE: 50,
  MAX_BATCH_SIZE: 100,
  PROCESSING_TIMEOUT_MS: 5000,
  CACHE_SIZE_LIMIT: 1000
} as const;