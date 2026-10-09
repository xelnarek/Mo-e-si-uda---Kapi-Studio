import React from 'react';
import { StudioApp } from './components/StudioApp';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAUpdateBanner } from './components/common/PWAUpdateBanner';
import { ToastProvider } from './components/common/ToastContext';

export default function App() {
  return (
    <ToastProvider>
      <PWAUpdateBanner />
      <StudioApp />
      <OfflineIndicator />
    </ToastProvider>
  );
}
