import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { useDashboardStats } from '../hooks/useRealTimeData';
import { StatusTile } from '../components/StatusTile';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { 
  Server, 
  Tags, 
  Activity, 
  FolderPlus,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Play,
  Clock,
  Gauge,
  Heart,
  Zap,
  Globe,
  Link2,
  RefreshCw,
  Pencil,
  Trash2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const DashboardPage = () => {
  const { token, canConfigure } = useAuth();
  const { 
    projects, 
    currentProject, 
    devices, 
    tags, 
    pollingStatus,
    selectProject, 
    createProject,
    updateProject,
    deleteProject,
    fetchProjects
  } = useProject();
  
  // Use real-time stats hook with 5 second polling, scoped to current project
  const { data: stats, loading: statsLoading, connectionType, refresh: refreshStats } = useDashboardStats(token, 5000, true, currentProject?.id || null);
  
  const [projectSummary, setProjectSummary] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState(null);
  const [editProject, setEditProject] = useState({ name: '', description: '' });
  const [editProjectId, setEditProjectId] = useState(null);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchProjectSummary = async () => {
      if (!currentProject) {
        setProjectSummary(null);
        return;
      }
      try {
        const response = await axios.get(`${API_URL}/api/projects/${currentProject.id}/reports/summary`, { headers });
        setProjectSummary(response.data);
      } catch (error) {
        console.error('Failed to fetch project summary:', error);
      }
    };
    fetchProjectSummary();
  }, [currentProject, token]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const project = await createProject(newProject);
      toast.success('Project created successfully');
      setShowCreateDialog(false);
      setNewProject({ name: '', description: '' });
      selectProject(project.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create project');
    }
    setLoading(false);
  };

  const handleEditProject = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProject(editProjectId, editProject);
      toast.success('Project updated');
      setShowEditDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update project');
    }
    setLoading(false);
  };

  const handleDeleteProject = async () => {
    if (!deleteProjectTarget) return;
    setLoading(true);
    try {
      await deleteProject(deleteProjectTarget.id);
      toast.success(`Project "${deleteProjectTarget.name}" deleted`);
      setDeleteProjectTarget(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete project');
    }
    setLoading(false);
  };

  const openEditDialog = (project, e) => {
    e.stopPropagation();
    setEditProjectId(project.id);
    setEditProject({ name: project.name, description: project.description || '' });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (project, e) => {
    e.stopPropagation();
    setDeleteProjectTarget(project);
  };

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Real-time Status Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            connectionType === 'polling' ? "bg-green-500" : "bg-yellow-500"
          )} />
          <span className="text-xs text-muted-foreground">
            {connectionType === 'polling' ? 'Live updates (5s)' : 'Connecting...'}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={refreshStats} className="h-7 text-xs">
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Gamification Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* System Uptime */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">System Uptime</p>
                <p className="text-2xl font-bold text-blue-500 mt-1">{stats?.uptime_formatted || '0s'}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/20">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Quality Score */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Data Quality</p>
                <p className="text-2xl font-bold text-green-500 mt-1">{stats?.data_quality_score || 100}%</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/20">
                <Gauge className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <Progress value={stats?.data_quality_score || 100} className="h-2 bg-green-500/20" />
          </CardContent>
        </Card>

        {/* Overall Health */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">System Health</p>
                <p className="text-2xl font-bold text-purple-500 mt-1">{stats?.overall_health || 100}%</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/20">
                <Heart className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <Progress value={stats?.overall_health || 100} className="h-2 bg-purple-500/20" />
          </CardContent>
        </Card>

        {/* Active Protocols */}
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Protocols</p>
                <p className="text-2xl font-bold text-orange-500 mt-1">{stats?.active_protocols?.total_active || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-500/20">
                <Zap className="w-6 h-6 text-orange-500" />
              </div>
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {stats?.active_protocols?.modbus_servers > 0 && <Badge variant="outline" className="text-xs">Modbus S: {stats.active_protocols.modbus_servers}</Badge>}
              {stats?.active_protocols?.modbus_clients > 0 && <Badge variant="outline" className="text-xs">Modbus C: {stats.active_protocols.modbus_clients}</Badge>}
              {stats?.active_protocols?.opcua_servers > 0 && <Badge variant="outline" className="text-xs">OPC UA S: {stats.active_protocols.opcua_servers}</Badge>}
              {stats?.active_protocols?.opcua_clients > 0 && <Badge variant="outline" className="text-xs">OPC UA C: {stats.active_protocols.opcua_clients}</Badge>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Original Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatusTile
          title="Total Projects"
          value={stats?.projects || 0}
          icon={FolderPlus}
        />
        <StatusTile
          title="Total Devices"
          value={stats?.devices || 0}
          icon={Server}
        />
        <StatusTile
          title="Online Devices"
          value={stats?.online_devices || 0}
          icon={Wifi}
          variant="success"
        />
        <StatusTile
          title="Total Tags"
          value={stats?.tags || 0}
          icon={Tags}
        />
        <StatusTile
          title="Recent Traffic"
          value={stats?.recent_traffic_count || 0}
          icon={Activity}
          variant="info"
        />
      </div>

      {/* Project Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project List */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Projects</CardTitle>
            {canConfigure() && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="create-project-btn">
                    <FolderPlus className="w-4 h-4 mr-1" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription className="sr-only">Fill in the details to create a new project</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateProject} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Project Name</Label>
                      <Input
                        id="name"
                        value={newProject.name}
                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                        placeholder="My Project"
                        required
                        data-testid="project-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        placeholder="Project description..."
                        data-testid="project-description-input"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading} data-testid="create-project-submit">
                      {loading ? 'Creating...' : 'Create Project'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No projects yet</p>
                <p className="text-sm">Create your first project to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-colors flex items-center justify-between group cursor-pointer",
                      currentProject?.id === project.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => selectProject(project.id)}
                    data-testid={`project-item-${project.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{project.name}</p>
                      {project.description && (
                        <p className="text-sm text-muted-foreground truncate">{project.description}</p>
                      )}
                    </div>
                    {canConfigure() && (
                      <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => openEditDialog(project, e)}
                          data-testid={`edit-project-${project.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => openDeleteDialog(project, e)}
                          data-testid={`delete-project-${project.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Project Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {currentProject ? currentProject.name : 'Select a Project'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!currentProject ? (
              <div className="text-center py-12 text-muted-foreground">
                <Server className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a project from the list to view details</p>
              </div>
            ) : projectSummary ? (
              <div className="space-y-6">
                {/* Polling Status */}
                <div className="flex items-center gap-4">
                  <Badge 
                    className={pollingStatus ? "bg-green-500/20 text-green-500" : ""}
                    data-testid="dashboard-polling-status"
                  >
                    {pollingStatus ? "Polling Active" : "Polling Stopped"}
                  </Badge>
                </div>

                {/* Device Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Server className="w-4 h-4" />
                      <span className="text-xs">Devices</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{projectSummary.devices?.total || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10">
                    <div className="flex items-center gap-2 text-green-500 mb-1">
                      <Wifi className="w-4 h-4" />
                      <span className="text-xs">Online</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-green-500">{projectSummary.devices?.online || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-500/10">
                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                      <WifiOff className="w-4 h-4" />
                      <span className="text-xs">Offline</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-zinc-500">{projectSummary.devices?.offline || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Tags className="w-4 h-4" />
                      <span className="text-xs">Tags</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{projectSummary.tags?.total || 0}</p>
                  </div>
                </div>

                {/* Protocol Distribution */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Protocol Distribution</p>
                  <div className="flex gap-2">
                    <Badge className="bg-blue-500/20 text-blue-500">
                      TCP: {projectSummary.devices?.by_protocol?.tcp || 0}
                    </Badge>
                    <Badge className="bg-purple-500/20 text-purple-500">
                      UDP: {projectSummary.devices?.by_protocol?.udp || 0}
                    </Badge>
                    <Badge className="bg-orange-500/20 text-orange-500">
                      RTU: {projectSummary.devices?.by_protocol?.rtu || 0}
                    </Badge>
                  </div>
                </div>

                {/* Tag Quality */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Tag Quality</p>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Good: {projectSummary.tags?.by_quality?.good || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm">Bad: {projectSummary.tags?.by_quality?.bad || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">Uncertain: {projectSummary.tags?.by_quality?.uncertain || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Traffic Stats */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Traffic Statistics</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-mono tabular-nums">{projectSummary.traffic?.total || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Success Rate</p>
                      <p className="font-mono tabular-nums text-green-500">
                        {(100 - (projectSummary.traffic?.error_rate || 0)).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg RTT</p>
                      <p className="font-mono tabular-nums">{projectSummary.traffic?.avg_rtt_ms || 0} ms</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Max RTT</p>
                      <p className="font-mono tabular-nums">{projectSummary.traffic?.max_rtt_ms || 0} ms</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription className="sr-only">Edit the project name and description</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project Name</Label>
              <Input
                id="edit-name"
                value={editProject.name}
                onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                required
                data-testid="edit-project-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editProject.description}
                onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                data-testid="edit-project-description-input"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="edit-project-submit">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation */}
      <AlertDialog open={!!deleteProjectTarget} onOpenChange={() => setDeleteProjectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteProjectTarget?.name}"? This will permanently delete all associated devices, tags, and traffic logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground" data-testid="confirm-delete-project">
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
