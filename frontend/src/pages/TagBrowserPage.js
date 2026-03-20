import React, { useState, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Tags, Search, RefreshCw, Filter, ChevronLeft, ChevronRight, Edit2, Lock, Unlock, Check, X, LineChart, Plus, Trash2, Settings2 } from 'lucide-react';
import { cn, getQualityColor, formatDate } from '../lib/utils';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const PAGE_SIZE = 50;

// Default new tag template
const DEFAULT_TAG = {
  name: '',
  device_id: '',
  object_type: 'holding_register',
  address: 0,
  bit: null,
  data_type: 'uint16',
  permission: 'R',
  scale: 1.0,
  offset: 0.0,
  unit: '',
  poll_ms: 1000,
  min_value: null,
  max_value: null,
  endian: 'ABCD',
  description: ''
};

export const TagBrowserPage = () => {
  const { token, canConfigure, canWrite } = useAuth();
  const { currentProject, devices, tags, refreshTags, setTags } = useProject();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [permissionFilter, setPermissionFilter] = useState('all');
  const [page, setPage] = useState(0);
  
  // Inline editing state
  const [editingTagId, setEditingTagId] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  // Force dialog state
  const [forceDialog, setForceDialog] = useState(null);
  const [forceValue, setForceValue] = useState('');
  
  // Tag create/edit dialog state
  const [tagDialog, setTagDialog] = useState(null); // null = closed, 'create' = new, tag object = edit
  const [tagForm, setTagForm] = useState(DEFAULT_TAG);
  const [tagSaving, setTagSaving] = useState(false);
  
  // Auto-refresh with WebSocket
  const wsRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };

  // WebSocket for real-time tag updates
  useEffect(() => {
    if (!currentProject?.id || !token) return;
    
    // Set up polling refresh (WebSocket may not work through ingress)
    refreshIntervalRef.current = setInterval(() => {
      refreshTags();
    }, 3000);
    
    // Try WebSocket connection
    const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    try {
      const ws = new WebSocket(`${wsUrl}/ws/tags/${currentProject.id}`);
      
      ws.onopen = () => {
        console.log('Tag WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'tag_update') {
            setTags(prev => prev.map(t => 
              t.id === msg.tag_id 
                ? { ...t, current_value: msg.value, quality: msg.quality, last_update: msg.timestamp }
                : t
            ));
          }
        } catch (e) {}
      };
      
      ws.onerror = () => {
        console.log('WebSocket error, using HTTP polling');
      };
      
      wsRef.current = ws;
    } catch (e) {
      console.log('WebSocket not available');
    }
    
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [currentProject?.id, token]);

  // Navigate to Historian with selected tag
  const handleViewInHistorian = (tag) => {
    // Store the tag info in sessionStorage for the Historian page to pick up
    sessionStorage.setItem('historian_add_tag', JSON.stringify({
      id: tag.id,
      name: tag.name,
      device_id: tag.device_id,
      data_type: tag.data_type
    }));
    navigate('/historian');
    toast.success(`Opening ${tag.name} in Historian`);
  };

  const deviceMap = useMemo(() => {
    const map = {};
    devices.forEach(d => { map[d.id] = d.name; });
    return map;
  }, [devices]);

  const filteredTags = useMemo(() => {
    return tags.filter(tag => {
      if (search && !tag.name.toLowerCase().includes(search.toLowerCase()) && 
          !tag.description?.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (deviceFilter !== 'all' && tag.device_id !== deviceFilter) {
        return false;
      }
      if (qualityFilter !== 'all' && tag.quality !== qualityFilter) {
        return false;
      }
      if (permissionFilter !== 'all' && tag.permission !== permissionFilter) {
        return false;
      }
      return true;
    });
  }, [tags, search, deviceFilter, qualityFilter, permissionFilter]);

  const paginatedTags = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredTags.slice(start, start + PAGE_SIZE);
  }, [filteredTags, page]);

  const totalPages = Math.ceil(filteredTags.length / PAGE_SIZE);

  const getObjectTypeBadge = (type) => {
    const colors = {
      'coil': 'bg-green-500/20 text-green-500',
      'discrete_input': 'bg-blue-500/20 text-blue-500',
      'input_register': 'bg-purple-500/20 text-purple-500',
      'holding_register': 'bg-orange-500/20 text-orange-500'
    };
    return colors[type] || 'bg-zinc-500/20 text-zinc-500';
  };

  const getPermissionBadge = (perm) => {
    const colors = {
      'R': 'bg-blue-500/20 text-blue-500',
      'W': 'bg-red-500/20 text-red-500',
      'RW': 'bg-purple-500/20 text-purple-500'
    };
    return colors[perm] || 'bg-zinc-500/20 text-zinc-500';
  };

  const handleStartEdit = (tag) => {
    setEditingTagId(tag.id);
    setEditValue(tag.current_value !== null && tag.current_value !== undefined ? String(tag.current_value) : '');
  };

  const handleCancelEdit = () => {
    setEditingTagId(null);
    setEditValue('');
  };

  const handleSaveEdit = async (tag) => {
    try {
      let value = editValue;
      if (tag.data_type === 'bool') {
        value = editValue.toLowerCase() === 'true' || editValue === '1';
      } else {
        value = parseFloat(editValue);
      }

      // Use write endpoint for writable tags, force for read-only
      const endpoint = tag.permission === 'R' 
        ? `${API_URL}/api/tags/${tag.id}/force`
        : `${API_URL}/api/tags/${tag.id}/write`;
      
      await axios.post(endpoint, { value }, { headers });
      
      // Update local state
      setTags(prev => prev.map(t => 
        t.id === tag.id ? { ...t, current_value: value } : t
      ));
      
      toast.success('Value updated');
      setEditingTagId(null);
      setEditValue('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update value');
    }
  };

  const handleOpenForceDialog = (tag) => {
    setForceDialog(tag);
    setForceValue(tag.current_value !== null && tag.current_value !== undefined ? String(tag.current_value) : '');
  };

  const handleForceValue = async () => {
    if (!forceDialog) return;
    
    try {
      let value = forceValue;
      if (forceDialog.data_type === 'bool') {
        value = forceValue.toLowerCase() === 'true' || forceValue === '1';
      } else {
        value = parseFloat(forceValue);
      }

      await axios.post(`${API_URL}/api/tags/${forceDialog.id}/force`, { value, force: true }, { headers });
      
      setTags(prev => prev.map(t => 
        t.id === forceDialog.id ? { ...t, current_value: value, is_forced: true } : t
      ));
      
      toast.success('Value forced');
      setForceDialog(null);
      setForceValue('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to force value');
    }
  };

  const handleReleaseForce = async (tag) => {
    try {
      await axios.post(`${API_URL}/api/tags/${tag.id}/release`, {}, { headers });
      
      setTags(prev => prev.map(t => 
        t.id === tag.id ? { ...t, is_forced: false } : t
      ));
      
      toast.success('Force released');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to release force');
    }
  };

  // Tag create/edit functions
  const handleOpenCreateTag = () => {
    setTagForm({ ...DEFAULT_TAG, device_id: devices[0]?.id || '' });
    setTagDialog('create');
  };

  const handleOpenEditTag = (tag) => {
    setTagForm({
      name: tag.name || '',
      device_id: tag.device_id || '',
      object_type: tag.object_type || 'holding_register',
      address: tag.address || 0,
      bit: tag.bit || null,
      data_type: tag.data_type || 'uint16',
      permission: tag.permission || 'R',
      scale: tag.scale || 1.0,
      offset: tag.offset || 0.0,
      unit: tag.unit || '',
      poll_ms: tag.poll_ms || 1000,
      min_value: tag.min_value,
      max_value: tag.max_value,
      endian: tag.endian || 'ABCD',
      description: tag.description || ''
    });
    setTagDialog(tag);
  };

  const handleSaveTag = async () => {
    if (!tagForm.name || !tagForm.device_id) {
      toast.error('Tag name and device are required');
      return;
    }
    
    setTagSaving(true);
    try {
      const payload = {
        ...tagForm,
        address: parseInt(tagForm.address) || 0,
        bit: tagForm.bit ? parseInt(tagForm.bit) : null,
        scale: parseFloat(tagForm.scale) || 1.0,
        offset: parseFloat(tagForm.offset) || 0.0,
        poll_ms: parseInt(tagForm.poll_ms) || 1000,
        min_value: tagForm.min_value !== '' && tagForm.min_value !== null ? parseFloat(tagForm.min_value) : null,
        max_value: tagForm.max_value !== '' && tagForm.max_value !== null ? parseFloat(tagForm.max_value) : null,
      };
      
      if (tagDialog === 'create') {
        // Create new tag
        const response = await axios.post(
          `${API_URL}/api/projects/${currentProject.id}/tags`,
          payload,
          { headers }
        );
        setTags(prev => [...prev, response.data]);
        toast.success(`Tag "${tagForm.name}" created`);
      } else {
        // Update existing tag
        const response = await axios.put(
          `${API_URL}/api/tags/${tagDialog.id}`,
          payload,
          { headers }
        );
        setTags(prev => prev.map(t => t.id === tagDialog.id ? response.data : t));
        toast.success(`Tag "${tagForm.name}" updated`);
      }
      
      setTagDialog(null);
      setTagForm(DEFAULT_TAG);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save tag');
    }
    setTagSaving(false);
  };

  const handleDeleteTag = async (tag) => {
    if (!window.confirm(`Delete tag "${tag.name}"?`)) return;
    
    try {
      await axios.delete(`${API_URL}/api/tags/${tag.id}`, { headers });
      setTags(prev => prev.filter(t => t.id !== tag.id));
      toast.success(`Tag "${tag.name}" deleted`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete tag');
    }
  };

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20" data-testid="tags-page-no-project">
        <Tags className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
        <p className="text-muted-foreground">Select a project from the sidebar to browse tags</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="tags-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tag Browser</h1>
          <p className="text-muted-foreground">{filteredTags.length} tags in {currentProject.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {canConfigure() && (
            <Button onClick={handleOpenCreateTag} data-testid="create-tag-btn">
              <Plus className="w-4 h-4 mr-2" />
              New Tag
            </Button>
          )}
          <Button variant="outline" onClick={refreshTags} data-testid="refresh-tags-btn">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tags..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="pl-9"
                  data-testid="tag-search-input"
                />
              </div>
            </div>
            <Select value={deviceFilter} onValueChange={(v) => { setDeviceFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]" data-testid="device-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Devices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                {devices.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={qualityFilter} onValueChange={(v) => { setQualityFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]" data-testid="quality-filter">
                <SelectValue placeholder="All Quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quality</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="bad">Bad</SelectItem>
                <SelectItem value="uncertain">Uncertain</SelectItem>
              </SelectContent>
            </Select>
            <Select value={permissionFilter} onValueChange={(v) => { setPermissionFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]" data-testid="permission-filter">
                <SelectValue placeholder="All Permissions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Permissions</SelectItem>
                <SelectItem value="R">Read Only</SelectItem>
                <SelectItem value="W">Write Only</SelectItem>
                <SelectItem value="RW">Read/Write</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tag Table */}
      <Card>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[200px]">Tag Name</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Address</TableHead>
                <TableHead>Data Type</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead className="text-right w-[150px]">Value</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    No tags found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTags.map((tag) => (
                  <TableRow key={tag.id} data-testid={`tag-row-${tag.id}`} className={tag.is_forced ? 'bg-yellow-500/10' : ''}>
                    <TableCell className="font-mono text-sm">
                      {tag.name}
                      {tag.is_forced && (
                        <Badge className="ml-2 bg-yellow-500/20 text-yellow-500">Forced</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{deviceMap[tag.device_id] || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getObjectTypeBadge(tag.object_type)}>
                        {tag.object_type?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{tag.address}</TableCell>
                    <TableCell className="font-mono text-xs">{tag.data_type?.toUpperCase()}</TableCell>
                    <TableCell>
                      <Badge className={getPermissionBadge(tag.permission)}>{tag.permission}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {editingTagId === tag.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-24 h-7 text-right font-mono text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(tag);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                            data-testid={`edit-input-${tag.id}`}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveEdit(tag)}>
                            <Check className="w-4 h-4 text-green-500" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}>
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <span className="font-mono tabular-nums">
                          {tag.current_value !== null && tag.current_value !== undefined 
                            ? (typeof tag.current_value === 'number' ? tag.current_value.toFixed(2) : String(tag.current_value))
                            : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn("font-medium text-sm capitalize", getQualityColor(tag.quality))}>
                        {tag.quality}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7"
                          onClick={() => handleViewInHistorian(tag)}
                          title="View in Historian"
                          data-testid={`historian-btn-${tag.id}`}
                        >
                          <LineChart className="w-4 h-4" />
                        </Button>
                        {(canWrite() || canConfigure()) && editingTagId !== tag.id && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7"
                            onClick={() => handleStartEdit(tag)}
                            title="Edit value"
                            data-testid={`edit-btn-${tag.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {canConfigure() && (
                          <>
                            {tag.is_forced ? (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7"
                                onClick={() => handleReleaseForce(tag)}
                                title="Release force"
                                data-testid={`release-btn-${tag.id}`}
                              >
                                <Unlock className="w-4 h-4 text-yellow-500" />
                              </Button>
                            ) : (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7"
                                onClick={() => handleOpenForceDialog(tag)}
                                title="Force value"
                                data-testid={`force-btn-${tag.id}`}
                              >
                                <Lock className="w-4 h-4" />
                              </Button>
                            )}
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => handleOpenEditTag(tag)}
                              title="Edit tag"
                              data-testid={`config-btn-${tag.id}`}
                            >
                              <Settings2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteTag(tag)}
                              title="Delete tag"
                              data-testid={`delete-btn-${tag.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, filteredTags.length)} of {filteredTags.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                data-testid="prev-page-btn"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                data-testid="next-page-btn"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Force Value Dialog */}
      <Dialog open={!!forceDialog} onOpenChange={() => setForceDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Value - {forceDialog?.name}</DialogTitle>
            <DialogDescription className="sr-only">Force a value to this tag, overriding normal polling</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Data Type</p>
                <p className="font-mono">{forceDialog?.data_type?.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Value</p>
                <p className="font-mono">{forceDialog?.current_value ?? '-'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Value</label>
              <Input
                value={forceValue}
                onChange={(e) => setForceValue(e.target.value)}
                placeholder={forceDialog?.data_type === 'bool' ? 'true/false' : 'Enter value'}
                data-testid="force-value-input"
              />
              <p className="text-xs text-muted-foreground">
                Forcing a value will override normal polling until released.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForceDialog(null)}>Cancel</Button>
            <Button onClick={handleForceValue} data-testid="confirm-force-btn">
              <Lock className="w-4 h-4 mr-2" />
              Force Value
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Create/Edit Dialog */}
      <Dialog open={!!tagDialog} onOpenChange={() => { setTagDialog(null); setTagForm(DEFAULT_TAG); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tagDialog === 'create' ? 'Create New Tag' : `Edit Tag - ${tagDialog?.name}`}</DialogTitle>
            <DialogDescription>Configure tag mapping for Modbus communication</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Row 1: Name and Device */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tag-name">Tag Name *</Label>
                <Input
                  id="tag-name"
                  value={tagForm.name}
                  onChange={(e) => setTagForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Tank_Level_001"
                  data-testid="tag-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag-device">Device *</Label>
                <Select value={tagForm.device_id} onValueChange={(v) => setTagForm(prev => ({ ...prev, device_id: v }))}>
                  <SelectTrigger id="tag-device" data-testid="tag-device-select">
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Object Type and Address */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tag-objtype">Object Type</Label>
                <Select value={tagForm.object_type} onValueChange={(v) => setTagForm(prev => ({ ...prev, object_type: v }))}>
                  <SelectTrigger id="tag-objtype" data-testid="tag-objtype-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coil">Coil (0x)</SelectItem>
                    <SelectItem value="discrete_input">Discrete Input (1x)</SelectItem>
                    <SelectItem value="input_register">Input Register (3x)</SelectItem>
                    <SelectItem value="holding_register">Holding Register (4x)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag-address">Address</Label>
                <Input
                  id="tag-address"
                  type="number"
                  min="0"
                  max="65535"
                  value={tagForm.address}
                  onChange={(e) => setTagForm(prev => ({ ...prev, address: e.target.value }))}
                  data-testid="tag-address-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag-bit">Bit (optional)</Label>
                <Input
                  id="tag-bit"
                  type="number"
                  min="0"
                  max="15"
                  value={tagForm.bit || ''}
                  onChange={(e) => setTagForm(prev => ({ ...prev, bit: e.target.value || null }))}
                  placeholder="0-15"
                  data-testid="tag-bit-input"
                />
              </div>
            </div>

            {/* Row 3: Data Type, Permission, Endian */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tag-dtype">Data Type</Label>
                <Select value={tagForm.data_type} onValueChange={(v) => setTagForm(prev => ({ ...prev, data_type: v }))}>
                  <SelectTrigger id="tag-dtype" data-testid="tag-dtype-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bool">BOOL</SelectItem>
                    <SelectItem value="int16">INT16</SelectItem>
                    <SelectItem value="uint16">UINT16</SelectItem>
                    <SelectItem value="int32">INT32</SelectItem>
                    <SelectItem value="uint32">UINT32</SelectItem>
                    <SelectItem value="float32">FLOAT32</SelectItem>
                    <SelectItem value="float64">FLOAT64</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag-perm">Permission</Label>
                <Select value={tagForm.permission} onValueChange={(v) => setTagForm(prev => ({ ...prev, permission: v }))}>
                  <SelectTrigger id="tag-perm" data-testid="tag-perm-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="R">Read Only</SelectItem>
                    <SelectItem value="W">Write Only</SelectItem>
                    <SelectItem value="RW">Read/Write</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag-endian">Endianness</Label>
                <Select value={tagForm.endian} onValueChange={(v) => setTagForm(prev => ({ ...prev, endian: v }))}>
                  <SelectTrigger id="tag-endian" data-testid="tag-endian-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABCD">ABCD (Big-endian)</SelectItem>
                    <SelectItem value="CDAB">CDAB (Word swap)</SelectItem>
                    <SelectItem value="BADC">BADC (Byte swap)</SelectItem>
                    <SelectItem value="DCBA">DCBA (Little-endian)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4: Scale, Offset, Unit */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tag-scale">Scale</Label>
                <Input
                  id="tag-scale"
                  type="number"
                  step="any"
                  value={tagForm.scale}
                  onChange={(e) => setTagForm(prev => ({ ...prev, scale: e.target.value }))}
                  data-testid="tag-scale-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag-offset">Offset</Label>
                <Input
                  id="tag-offset"
                  type="number"
                  step="any"
                  value={tagForm.offset}
                  onChange={(e) => setTagForm(prev => ({ ...prev, offset: e.target.value }))}
                  data-testid="tag-offset-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag-unit">Unit</Label>
                <Input
                  id="tag-unit"
                  value={tagForm.unit}
                  onChange={(e) => setTagForm(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="e.g., °C, bar, m³/h"
                  data-testid="tag-unit-input"
                />
              </div>
            </div>

            {/* Row 5: Min, Max, Poll interval */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tag-min">Min Value</Label>
                <Input
                  id="tag-min"
                  type="number"
                  step="any"
                  value={tagForm.min_value ?? ''}
                  onChange={(e) => setTagForm(prev => ({ ...prev, min_value: e.target.value }))}
                  placeholder="Optional"
                  data-testid="tag-min-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag-max">Max Value</Label>
                <Input
                  id="tag-max"
                  type="number"
                  step="any"
                  value={tagForm.max_value ?? ''}
                  onChange={(e) => setTagForm(prev => ({ ...prev, max_value: e.target.value }))}
                  placeholder="Optional"
                  data-testid="tag-max-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag-poll">Poll Interval (ms)</Label>
                <Input
                  id="tag-poll"
                  type="number"
                  min="100"
                  step="100"
                  value={tagForm.poll_ms}
                  onChange={(e) => setTagForm(prev => ({ ...prev, poll_ms: e.target.value }))}
                  data-testid="tag-poll-input"
                />
              </div>
            </div>

            {/* Row 6: Description */}
            <div className="space-y-2">
              <Label htmlFor="tag-desc">Description</Label>
              <Input
                id="tag-desc"
                value={tagForm.description}
                onChange={(e) => setTagForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                data-testid="tag-desc-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTagDialog(null); setTagForm(DEFAULT_TAG); }}>Cancel</Button>
            <Button onClick={handleSaveTag} disabled={tagSaving} data-testid="save-tag-btn">
              {tagSaving ? 'Saving...' : (tagDialog === 'create' ? 'Create Tag' : 'Save Changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
