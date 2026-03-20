import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Slider } from '../components/ui/slider';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Settings, Users, Shield, History, Trash2, Upload, Image } from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatDate } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Logo settings stored in localStorage
const DEFAULT_LOGO_SETTINGS = {
  leftLogo: null,
  rightLogo: null,
  leftLogoSize: 40,
  rightLogoSize: 40
};

export const SettingsPage = () => {
  const { token, user, isAdmin } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  
  // Logo settings
  const [logoSettings, setLogoSettings] = useState(() => {
    const saved = localStorage.getItem('comgate_logo_settings');
    return saved ? JSON.parse(saved) : DEFAULT_LOGO_SETTINGS;
  });
  
  const leftLogoInputRef = useRef(null);
  const rightLogoInputRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
      fetchAuditLogs();
    }
  }, []);

  // Save logo settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('comgate_logo_settings', JSON.stringify(logoSettings));
    // Dispatch event so other components can react to logo changes
    window.dispatchEvent(new CustomEvent('logoSettingsChanged', { detail: logoSettings }));
  }, [logoSettings]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`, { headers });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/audit-logs?limit=100`, { headers });
      setAuditLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`${API_URL}/api/users/${userId}/role?role=${newRole}`, {}, { headers });
      toast.success('Role updated');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update role');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    
    try {
      await axios.delete(`${API_URL}/api/users/${deleteUser.id}`, { headers });
      toast.success('User deleted');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
    setDeleteUser(null);
  };

  const handleLogoUpload = (side, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoSettings(prev => ({
        ...prev,
        [side === 'left' ? 'leftLogo' : 'rightLogo']: e.target.result
      }));
      toast.success(`${side === 'left' ? 'Left' : 'Right'} logo uploaded`);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (side) => {
    setLogoSettings(prev => ({
      ...prev,
      [side === 'left' ? 'leftLogo' : 'rightLogo']: null
    }));
    toast.success(`${side === 'left' ? 'Left' : 'Right'} logo removed`);
  };

  const handleLogoSizeChange = (side, value) => {
    setLogoSettings(prev => ({
      ...prev,
      [side === 'left' ? 'leftLogoSize' : 'rightLogoSize']: value[0]
    }));
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-500';
      case 'engineer': return 'bg-blue-500/20 text-blue-500';
      case 'operator': return 'bg-green-500/20 text-green-500';
      default: return 'bg-zinc-500/20 text-zinc-500';
    }
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('delete')) return 'bg-red-500/20 text-red-500';
    if (action.includes('create') || action.includes('start')) return 'bg-green-500/20 text-green-500';
    if (action.includes('update') || action.includes('write')) return 'bg-blue-500/20 text-blue-500';
    return 'bg-zinc-500/20 text-zinc-500';
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage branding, users, roles, and view audit logs</p>
      </div>

      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding">
            <Image className="w-4 h-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="profile">
            <Settings className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          {isAdmin() && (
            <>
              <TabsTrigger value="users">
                <Users className="w-4 h-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="audit">
                <History className="w-4 h-4 mr-2" />
                Audit Log
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="branding" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Logo */}
            <Card>
              <CardHeader>
                <CardTitle>Left Logo</CardTitle>
                <CardDescription>Upload a logo to display on the left side of the header</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={leftLogoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload('left', e)}
                  className="hidden"
                />
                
                {logoSettings.leftLogo ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
                      <img 
                        src={logoSettings.leftLogo} 
                        alt="Left Logo" 
                        style={{ height: logoSettings.leftLogoSize }}
                        className="max-w-full object-contain"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Logo Size: {logoSettings.leftLogoSize}px</Label>
                      <Slider
                        value={[logoSettings.leftLogoSize]}
                        onValueChange={(v) => handleLogoSizeChange('left', v)}
                        min={20}
                        max={100}
                        step={5}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => leftLogoInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Change
                      </Button>
                      <Button variant="destructive" onClick={() => handleRemoveLogo('left')}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full h-32 border-dashed"
                    onClick={() => leftLogoInputRef.current?.click()}
                  >
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p>Click to upload left logo</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
                    </div>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Right Logo */}
            <Card>
              <CardHeader>
                <CardTitle>Right Logo</CardTitle>
                <CardDescription>Upload a logo to display on the right side of the header</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={rightLogoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload('right', e)}
                  className="hidden"
                />
                
                {logoSettings.rightLogo ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
                      <img 
                        src={logoSettings.rightLogo} 
                        alt="Right Logo" 
                        style={{ height: logoSettings.rightLogoSize }}
                        className="max-w-full object-contain"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Logo Size: {logoSettings.rightLogoSize}px</Label>
                      <Slider
                        value={[logoSettings.rightLogoSize]}
                        onValueChange={(v) => handleLogoSizeChange('right', v)}
                        min={20}
                        max={100}
                        step={5}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => rightLogoInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Change
                      </Button>
                      <Button variant="destructive" onClick={() => handleRemoveLogo('right')}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full h-32 border-dashed"
                    onClick={() => rightLogoInputRef.current?.click()}
                  >
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p>Click to upload right logo</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
                    </div>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-xl font-semibold">{user?.username}</p>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <Badge className={cn("mt-1", getRoleBadgeColor(user?.role))}>
                    <Shield className="w-3 h-3 mr-1" />
                    {user?.role?.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="text-sm">{formatDate(user?.created_at)}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Role Permissions</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", user?.role === 'viewer' ? 'bg-green-500' : 'bg-zinc-500')} />
                    <span>View projects, devices, tags, and reports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", ['operator', 'engineer', 'admin'].includes(user?.role) ? 'bg-green-500' : 'bg-zinc-500')} />
                    <span>Write values to tags</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", ['engineer', 'admin'].includes(user?.role) ? 'bg-green-500' : 'bg-zinc-500')} />
                    <span>Configure projects, devices, and import tags</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", user?.role === 'admin' ? 'bg-green-500' : 'bg-zinc-500')} />
                    <span>Manage users and access audit logs</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin() && (
          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user roles and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                        <TableCell className="font-medium">{u.username}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            onValueChange={(value) => handleRoleChange(u.id, value)}
                            disabled={u.id === user?.id}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="operator">Operator</SelectItem>
                              <SelectItem value="engineer">Engineer</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(u.created_at)}
                        </TableCell>
                        <TableCell>
                          {u.id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteUser(u)}
                              data-testid={`delete-user-${u.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin() && (
          <TabsContent value="audit" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>Recent system activity and changes</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                            No audit logs yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-xs">
                              {formatDate(log.timestamp)}
                            </TableCell>
                            <TableCell>{log.username}</TableCell>
                            <TableCell>
                              <Badge className={getActionBadgeColor(log.action)}>
                                {log.action.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono max-w-[300px] truncate" title={JSON.stringify(log.details)}>
                              {Object.entries(log.details || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete user "{deleteUser?.username}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
