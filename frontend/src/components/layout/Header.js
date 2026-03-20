import React, { useState, useEffect } from 'react';
import { Moon, Sun, Play, Square, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { useTheme } from '../../context/ThemeContext';
import { useProject } from '../../context/ProjectContext';
import { Badge } from '../ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { useLocation } from 'react-router-dom';

const pathLabels = {
  'dashboard': 'Dashboard',
  'devices': 'Devices',
  'tags': 'Tag Browser',
  'import': 'Excel Import',
  'write': 'Write Console',
  'traffic': 'Traffic Monitor',
  'reports': 'Reports',
  'simulator': 'Simulator',
  'settings': 'Settings',
  'historian': 'Historian'
};

export const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { currentProject, pollingStatus, startPolling, stopPolling, refreshTags } = useProject();
  const location = useLocation();
  
  // Logo settings state
  const [logoSettings, setLogoSettings] = useState(() => {
    const saved = localStorage.getItem('comgate_logo_settings');
    return saved ? JSON.parse(saved) : { leftLogo: null, rightLogo: null, leftLogoSize: 40, rightLogoSize: 40 };
  });

  // Listen for logo settings changes
  useEffect(() => {
    const handleLogoChange = (e) => {
      setLogoSettings(e.detail);
    };
    window.addEventListener('logoSettingsChanged', handleLogoChange);
    return () => window.removeEventListener('logoSettingsChanged', handleLogoChange);
  }, []);

  const currentPath = location.pathname.split('/')[1];
  const currentLabel = pathLabels[currentPath] || 'Home';

  const handleTogglePolling = async () => {
    try {
      if (pollingStatus) {
        await stopPolling();
      } else {
        await startPolling();
      }
    } catch (error) {
      console.error('Failed to toggle polling:', error);
    }
  };

  return (
    <header 
      className="sticky top-0 z-40 h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6"
      data-testid="header"
    >
      {/* Left section with logo */}
      <div className="flex items-center gap-4">
        {logoSettings.leftLogo && (
          <img 
            src={logoSettings.leftLogo} 
            alt="Left Logo" 
            style={{ height: logoSettings.leftLogoSize }}
            className="object-contain"
          />
        )}
        
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {currentProject && (
          <Badge variant="secondary" className="font-mono text-xs">
            {currentProject.name}
          </Badge>
        )}
      </div>

      {/* Right section with controls and logo */}
      <div className="flex items-center gap-2">
        {currentProject && (
          <>
            <Badge 
              variant={pollingStatus ? "default" : "secondary"}
              className={pollingStatus ? "bg-green-500/20 text-green-500 border-green-500/30" : ""}
              data-testid="polling-status"
            >
              {pollingStatus ? "Polling Active" : "Polling Stopped"}
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePolling}
              data-testid="toggle-polling-btn"
            >
              {pollingStatus ? (
                <>
                  <Square className="w-4 h-4 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Start
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={refreshTags}
              title="Refresh Tags"
              data-testid="refresh-tags-btn"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          data-testid="theme-toggle"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>
        
        {logoSettings.rightLogo && (
          <img 
            src={logoSettings.rightLogo} 
            alt="Right Logo" 
            style={{ height: logoSettings.rightLogoSize }}
            className="object-contain ml-2"
          />
        )}
      </div>
    </header>
  );
};
