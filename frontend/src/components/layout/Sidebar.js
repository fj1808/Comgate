import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Server, 
  Tags, 
  Activity, 
  FileText, 
  Settings, 
  Play, 
  LogOut,
  FolderOpen,
  Upload,
  PenTool,
  ChevronLeft,
  ChevronRight,
  LineChart,
  Globe,
  Layers,
  BarChart3,
  Wifi
} from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { cn } from '../../lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/devices', icon: Server, label: 'Devices' },
  { path: '/tags', icon: Tags, label: 'Tag Browser' },
  { path: '/import', icon: Upload, label: 'Excel Import' },
  { path: '/write', icon: PenTool, label: 'Write Console' },
  { path: '/traffic', icon: Activity, label: 'Traffic Monitor' },
  { path: '/historian', icon: LineChart, label: 'Historian' },
  { path: '/historian-builder', icon: Layers, label: 'Graphics Builder' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/simulator', icon: Play, label: 'Modbus' },
  { path: '/opc', icon: Globe, label: 'OPC UA/DA' },
  { path: '/discovery', icon: Wifi, label: 'Network Discovery' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export const Sidebar = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const { projects, currentProject, selectProject } = useProject();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col z-50 transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
      data-testid="sidebar"
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <Server className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">ComGate</span>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggle}
          className="shrink-0"
          data-testid="sidebar-toggle"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Project Selector */}
      {!collapsed && (
        <div className="p-3 border-b border-border">
          <Select 
            value={currentProject?.id || ''} 
            onValueChange={(value) => selectProject(value)}
          >
            <SelectTrigger className="w-full" data-testid="project-selector">
              <FolderOpen className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "sidebar-nav-item",
                isActive && "active",
                collapsed && "justify-center px-2"
              )
            }
            data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-border">
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3 px-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
        )}
        <Button 
          variant="ghost" 
          className={cn("w-full", collapsed ? "px-2" : "justify-start")}
          onClick={handleLogout}
          data-testid="logout-btn"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </aside>
  );
};
