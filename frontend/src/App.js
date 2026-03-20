import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProjectProvider } from './context/ProjectContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { TagBrowserPage } from './pages/TagBrowserPage';
import { ImportPage } from './pages/ImportPage';
import { WriteConsolePage } from './pages/WriteConsolePage';
import { TrafficMonitorPage } from './pages/TrafficMonitorPage';
import { ReportsPage } from './pages/ReportsPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { SettingsPage } from './pages/SettingsPage';
import { HistorianPage } from './pages/HistorianPage';
import { HistorianBuilderPage } from './pages/HistorianBuilderPage';
import { OPCPage } from './pages/OPCPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NetworkDiscoveryPage } from './pages/NetworkDiscoveryPage';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProjectProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/devices" element={<DevicesPage />} />
                <Route path="/tags" element={<TagBrowserPage />} />
                <Route path="/import" element={<ImportPage />} />
                <Route path="/write" element={<WriteConsolePage />} />
                <Route path="/traffic" element={<TrafficMonitorPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/simulator" element={<SimulatorPage />} />
                <Route path="/opc" element={<OPCPage />} />
                <Route path="/discovery" element={<NetworkDiscoveryPage />} />
                <Route path="/historian" element={<HistorianPage />} />
                <Route path="/historian-builder" element={<HistorianBuilderPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster 
            position="top-right" 
            richColors 
            closeButton
            theme="system"
          />
        </ProjectProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
