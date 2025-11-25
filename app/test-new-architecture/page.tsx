'use client';

import { NewPontoonConfigurator } from '../components/NewPontoonConfigurator';
import { LoginOverlay } from '../components/LoginOverlay';

/**
 * Test page for the new architecture
 * Used by Playwright tests to validate the new system
 * Protected by LoginOverlay (duwe/preview)
 */
export default function TestNewArchitecture() {
  return (
    <LoginOverlay>
      <div className="w-full h-screen">
        <NewPontoonConfigurator />
      </div>
    </LoginOverlay>
  );
}