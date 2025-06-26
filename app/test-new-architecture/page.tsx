'use client';

import { NewPontoonConfigurator } from '../components/NewPontoonConfigurator';

/**
 * Test page for the new architecture
 * Used by Playwright tests to validate the new system
 */
export default function TestNewArchitecture() {
  return (
    <div className="w-full h-screen">
      <NewPontoonConfigurator />
    </div>
  );
}