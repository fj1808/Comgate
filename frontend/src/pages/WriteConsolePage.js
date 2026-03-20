import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ScrollArea } from '../components/ui/scroll-area';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { PenTool, Search, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn, getQualityColor } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const WriteConsolePage = () => {
  const { token, canWrite } = useAuth();
  const { currentProject, devices, tags, refreshTags } = useProject();
  
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [writeValues, setWriteValues] = useState({});
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [writing, setWriting] = useState(false);
  const [results, setResults] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  const deviceMap = useMemo(() => {
    const map = {};
    devices.forEach(d => { map[d.id] = d.name; });
    return map;
  }, [devices]);

  const writableTags = useMemo(() => {
    return tags.filter(tag => 
      tag.permission === 'W' || tag.permission === 'RW'
    ).filter(tag => 
      !search || 
      tag.name.toLowerCase().includes(search.toLowerCase()) ||
      tag.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [tags, search]);

  const handleSelectTag = (tagId, checked) => {
    if (checked) {
      setSelectedTags([...selectedTags, tagId]);
    } else {
      setSelectedTags(selectedTags.filter(id => id !== tagId));
      const newValues = { ...writeValues };
      delete newValues[tagId];
      setWriteValues(newValues);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedTags(writableTags.map(t => t.id));
    } else {
      setSelectedTags([]);
      setWriteValues({});
    }
  };

  const handleValueChange = (tagId, value) => {
    setWriteValues({ ...writeValues, [tagId]: value });
  };

  const handleWrite = async () => {
    setConfirmDialog(false);
    setWriting(true);
    setResults([]);
    
    const writes = selectedTags
      .filter(tagId => writeValues[tagId] !== undefined && writeValues[tagId] !== '')
      .map(tagId => {
        const tag = tags.find(t => t.id === tagId);
        let value = writeValues[tagId];
        
        // Convert value based on data type
        if (tag?.data_type === 'bool') {
          value = value === 'true' || value === '1' || value === true;
        } else {
          value = parseFloat(value);
        }
        
        return { tag_id: tagId, value };
      });

    if (writes.length === 0) {
      toast.error('No values to write');
      setWriting(false);
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/projects/${currentProject.id}/batch-write`,
        { writes },
        { headers }
      );
      
      setResults(response.data.results);
      
      const successCount = response.data.results.filter(r => r.success).length;
      const errorCount = response.data.results.filter(r => !r.success).length;
      
      if (errorCount === 0) {
        toast.success(`Successfully wrote ${successCount} tags`);
      } else {
        toast.warning(`Wrote ${successCount} tags, ${errorCount} failed`);
      }
      
      refreshTags();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Write failed');
    }
    
    setWriting(false);
  };

  const getTagById = (tagId) => tags.find(t => t.id === tagId);

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20" data-testid="write-page-no-project">
        <PenTool className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
        <p className="text-muted-foreground">Select a project from the sidebar to write values</p>
      </div>
    );
  }

  if (!canWrite()) {
    return (
      <div className="flex flex-col items-center justify-center py-20" data-testid="write-page-no-permission">
        <AlertTriangle className="w-16 h-16 text-yellow-500/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Permission Denied</h2>
        <p className="text-muted-foreground">You don't have permission to write values</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="write-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Write Console</h1>
          <p className="text-muted-foreground">Write values to tags in {currentProject.name}</p>
        </div>
        <Button 
          onClick={() => setConfirmDialog(true)}
          disabled={selectedTags.length === 0 || writing}
          data-testid="write-btn"
        >
          <Send className="w-4 h-4 mr-2" />
          Write {selectedTags.length > 0 ? `(${selectedTags.length})` : ''}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tag Selection */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Writable Tags</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="write-search-input"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedTags.length === writableTags.length && writableTags.length > 0}
                        onCheckedChange={handleSelectAll}
                        data-testid="select-all-checkbox"
                      />
                    </TableHead>
                    <TableHead>Tag Name</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead className="w-[150px]">New Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {writableTags.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        No writable tags found
                      </TableCell>
                    </TableRow>
                  ) : (
                    writableTags.map((tag) => (
                      <TableRow key={tag.id} data-testid={`write-tag-row-${tag.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedTags.includes(tag.id)}
                            onCheckedChange={(checked) => handleSelectTag(tag.id, checked)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{tag.name}</TableCell>
                        <TableCell className="text-sm">{deviceMap[tag.device_id] || '-'}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {tag.current_value !== null && tag.current_value !== undefined 
                            ? (typeof tag.current_value === 'number' ? tag.current_value.toFixed(2) : String(tag.current_value))
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-sm capitalize", getQualityColor(tag.quality))}>
                            {tag.quality}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type={tag.data_type === 'bool' ? 'text' : 'number'}
                            placeholder={tag.data_type === 'bool' ? 'true/false' : 'Value'}
                            value={writeValues[tag.id] || ''}
                            onChange={(e) => handleValueChange(tag.id, e.target.value)}
                            disabled={!selectedTags.includes(tag.id)}
                            className="h-8"
                            data-testid={`write-value-${tag.id}`}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Write Summary & Results */}
        <Card>
          <CardHeader>
            <CardTitle>Write Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Selected Tags</p>
              <p className="text-2xl font-bold tabular-nums">{selectedTags.length}</p>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Values Entered</p>
              <p className="text-2xl font-bold tabular-nums">
                {Object.values(writeValues).filter(v => v !== '' && v !== undefined).length}
              </p>
            </div>

            {results.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Results</p>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {results.map((result, idx) => {
                      const tag = getTagById(result.tag_id);
                      return (
                        <div 
                          key={idx}
                          className={cn(
                            "p-2 rounded-lg text-sm flex items-center gap-2",
                            result.success ? "bg-green-500/10" : "bg-red-500/10"
                          )}
                        >
                          {result.success ? (
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-mono text-xs truncate">{tag?.name || result.tag_id}</p>
                            {result.error && (
                              <p className="text-xs text-red-500">{result.error}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Write</DialogTitle>
            <DialogDescription>
              Are you sure you want to write values to the selected tags? This action will modify the device registers.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead className="text-right">New Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedTags
                  .filter(tagId => writeValues[tagId] !== undefined && writeValues[tagId] !== '')
                  .map(tagId => {
                    const tag = getTagById(tagId);
                    return (
                      <TableRow key={tagId}>
                        <TableCell className="font-mono text-sm">{tag?.name}</TableCell>
                        <TableCell className="text-right font-mono">{writeValues[tagId]}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>Cancel</Button>
            <Button onClick={handleWrite} disabled={writing} data-testid="confirm-write-btn">
              {writing ? 'Writing...' : 'Confirm Write'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
