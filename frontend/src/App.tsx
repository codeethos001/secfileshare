import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/authentication/AuthContext';
import { RootLayout } from './layouts/RootLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ShieldOff } from 'lucide-react';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { MyFilesPage } from './pages/MyFilesPage';
import { SharesPage } from './pages/SharesPage';
import { DownloadPage } from './pages/DownloadPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';

// Detect whether we are in a Secure Context (HTTPS or localhost).
// window.crypto.subtle is undefined on plain-HTTP non-localhost origins.
const isSecureContext =
  typeof window !== 'undefined' &&
  (window.isSecureContext ?? (window.crypto && !!window.crypto.subtle));

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      {!isSecureContext && (
        <div className="flex items-center gap-3 bg-red-950 border-b border-red-800 px-4 py-2.5 text-red-200 text-xs">
          <ShieldOff className="w-4 h-4 shrink-0 text-red-400" />
          <span>
            <strong className="text-red-100">Insecure context detected.</strong>{' '}
            Web Crypto API (crypto.subtle) is unavailable over plain HTTP on a
            non-localhost origin. Open the app at{' '}
            <code className="bg-red-900 px-1 rounded">http://localhost:5173</code>{' '}
            or serve it over HTTPS. Encryption and decryption will not work until
            you do.
          </span>
        </div>
      )}
      <AuthProvider>
        <Routes>
          <Route element={<RootLayout />}>
            {/* Public Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/s/:shareId" element={<DownloadPage />} />

            {/* Authenticated Dashboard Pages */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/files" element={<MyFilesPage />} />
              <Route path="/shares" element={<SharesPage />} />
              <Route path="/activity" element={<AuditLogsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
