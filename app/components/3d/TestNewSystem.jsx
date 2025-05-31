/**
 * TestNewSystem - Test Component for New Mathematical Precision System
 * 
 * Simple redirect to the new PontoonConfigurator
 */

'use client';

import { PontoonConfigurator } from '../configurator/PontoonConfigurator';

export default function TestNewSystem() {
  return (
    <div className="w-full h-screen">
      <PontoonConfigurator />
    </div>
  );
}