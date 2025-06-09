/**
 * LevelSelector - Multi-Level Pontoon Deck Selector
 * 
 * Allows switching between different pontoon levels:
 * Level -1: Underwater Foundation
 * Level 0: Water Surface 
 * Level 1: First Deck
 * Level 2: Second Deck
 */

'use client';

import { useConfiguratorStore } from '../../store/configuratorStore';

export function LevelSelector() {
  const { currentLevel, setCurrentLevel } = useConfiguratorStore();

  const levels = [
    { value: -1, label: 'Level -1', title: 'Unterwasser-Fundament' },
    { value: 0, label: 'Level 0', title: 'Wasseroberfläche' },
    { value: 1, label: 'Level 1', title: 'Erstes Deck' },
    { value: 2, label: 'Level 2', title: 'Zweites Deck' },
  ] as const;

  return (
    <div className="flex flex-col gap-1 bg-white rounded-lg shadow-lg p-1">
      {levels.map((level) => (
        <button
          key={level.value}
          onClick={() => setCurrentLevel(level.value)}
          className={`px-3 py-2 rounded transition-colors text-sm font-medium ${
            currentLevel === level.value
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          title={level.title}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}