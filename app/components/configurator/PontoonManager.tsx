/**
 * PontoonManager - Efficient Pontoon Rendering
 * 
 * Manages all pontoon instances with optimal performance
 * Uses simple box geometry for mathematical precision focus
 */

'use client';

import { useMemo } from 'react';
import { useConfiguratorStore } from '../../store/configuratorStore';
import { Pontoon } from '../primitives/Pontoon';

export function PontoonManager() {
  const pontoons = useConfiguratorStore((state) => state.pontoons);
  const selectedIds = useConfiguratorStore((state) => state.selectedIds);

  // Convert map to array for React rendering
  const pontoonElements = useMemo(() => {
    const pontoonsArray = Array.from(pontoons.values());
    
    return pontoonsArray.map((pontoon) => (
      <Pontoon
        key={pontoon.id}
        pontoon={pontoon}
        isSelected={selectedIds.has(pontoon.id)}
      />
    ));
  }, [pontoons, selectedIds]);

  return <>{pontoonElements}</>;
}