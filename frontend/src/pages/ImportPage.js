import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertTriangle, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const ImportPage = () => {
  const { token } = useAuth();
  const { currentProject, devices, refreshTags } = useProject();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [importMode, setImportMode] = useState('replace');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast.error('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      setFile(selectedFile);
      setReport(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !currentProject) return;
    
    if (devices.length === 0) {
      toast.error('Please create at least one device before importing tags');
      return;
    }

    setUploading(true);
    setProgress(10);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      setProgress(30);
      
      const response = await axios.post(
        `${API_URL}/api/projects/${currentProject.id}/import?mode=${importMode}`,
        formData,
        {
          headers: {
            ...headers,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(30 + percentCompleted * 0.5);
          }
        }
      );
      
      setProgress(100);
      setReport(response.data);
      
      if (response.data.error_count === 0) {
        toast.success(`Successfully imported ${response.data.success_count} tags`);
      } else {
        toast.warning(`Imported ${response.data.success_count} tags with ${response.data.error_count} errors`);
      }
      
      refreshTags();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
      setReport(null);
    }
    
    setUploading(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/projects/${currentProject.id}/template`,
        {
          headers,
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'tag_mapping_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Template downloaded');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20" data-testid="import-page-no-project">
        <Upload className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
        <p className="text-muted-foreground">Select a project from the sidebar to import tags</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="import-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Excel Import</h1>
          <p className="text-muted-foreground">Import tag mappings from Excel for {currentProject.name}</p>
        </div>
        <Button variant="outline" onClick={handleDownloadTemplate} data-testid="download-template-btn">
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Excel File</CardTitle>
            <CardDescription>
              Select an Excel file with tag mappings. Devices will be auto-created if they don't exist.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-testid="file-dropzone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="file-input"
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="w-10 h-10 text-green-500" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Click to select or drag and drop</p>
                  <p className="text-sm text-muted-foreground">.xlsx or .xls files</p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Import Mode</label>
              <Select value={importMode} onValueChange={setImportMode}>
                <SelectTrigger data-testid="import-mode-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="replace">Replace All Tags</SelectItem>
                  <SelectItem value="merge">Merge/Append Tags</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {importMode === 'replace' 
                  ? 'All existing tags will be deleted before import'
                  : 'New tags will be added, existing tags with same name will be skipped'}
              </p>
            </div>

            {uploading && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  {progress < 100 ? 'Uploading and processing...' : 'Complete!'}
                </p>
              </div>
            )}

            <Button 
              className="w-full" 
              onClick={handleUpload} 
              disabled={!file || uploading}
              data-testid="import-btn"
            >
              {uploading ? 'Importing...' : 'Import Tags'}
            </Button>
          </CardContent>
        </Card>

        {/* Requirements Section */}
        <Card>
          <CardHeader>
            <CardTitle>Required Columns</CardTitle>
            <CardDescription>Your Excel file must include these columns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'TagName', desc: 'Unique tag identifier', required: true },
                { name: 'DeviceName', desc: 'Auto-created if not exists', required: true },
                { name: 'ObjectType', desc: 'HR, IR, COIL, or DI', required: true },
                { name: 'Address', desc: 'Modbus address (0-65535)', required: true },
                { name: 'DataType', desc: 'BOOL, INT16, UINT16, FLOAT32, etc.', required: true },
                { name: 'R_W', desc: 'R (Read), W (Write), or RW', required: true },
                { name: 'Scale', desc: 'Linear scaling factor', required: false },
                { name: 'Offset', desc: 'Linear scaling offset', required: false },
                { name: 'Unit', desc: 'Engineering unit (bar, °C, etc.)', required: false },
                { name: 'Poll_ms', desc: 'Polling interval in milliseconds', required: false },
                { name: 'Description', desc: 'Tag description', required: false },
              ].map(col => (
                <div key={col.name} className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm">{col.name}</span>
                    <p className="text-xs text-muted-foreground">{col.desc}</p>
                  </div>
                  <Badge variant={col.required ? "default" : "secondary"}>
                    {col.required ? 'Required' : 'Optional'}
                  </Badge>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-1">Available Devices:</p>
              <div className="flex flex-wrap gap-1">
                {devices.map(d => (
                  <Badge key={d.id} variant="outline" className="font-mono text-xs">
                    {d.name}
                  </Badge>
                ))}
                {devices.length === 0 && (
                  <span className="text-sm text-muted-foreground">No devices configured</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Report */}
      {report && (
        <Card data-testid="import-report">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Import Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold tabular-nums">{report.total_rows}</p>
                <p className="text-sm text-muted-foreground">Total Rows</p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 text-center">
                <p className="text-2xl font-bold tabular-nums text-green-500">{report.success_count}</p>
                <p className="text-sm text-muted-foreground">Success</p>
              </div>
              <div className="p-4 rounded-lg bg-yellow-500/10 text-center">
                <p className="text-2xl font-bold tabular-nums text-yellow-500">{report.warning_count}</p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </div>
              <div className="p-4 rounded-lg bg-red-500/10 text-center">
                <p className="text-2xl font-bold tabular-nums text-red-500">{report.error_count}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>

            {(report.errors?.length > 0 || report.warnings?.length > 0) && (
              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Row</TableHead>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.errors?.map((error, idx) => (
                      <TableRow key={`err-${idx}`}>
                        <TableCell className="font-mono">{error.row}</TableCell>
                        <TableCell>
                          <Badge className="bg-red-500/20 text-red-500">
                            <XCircle className="w-3 h-3 mr-1" />
                            Error
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{error.message}</TableCell>
                      </TableRow>
                    ))}
                    {report.warnings?.map((warn, idx) => (
                      <TableRow key={`warn-${idx}`}>
                        <TableCell className="font-mono">{warn.row}</TableCell>
                        <TableCell>
                          <Badge className="bg-yellow-500/20 text-yellow-500">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Warning
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{warn.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}

            {report.success_count > 0 && report.error_count === 0 && report.warning_count === 0 && (
              <div className="flex items-center justify-center gap-2 p-6 rounded-lg bg-green-500/10 text-green-500">
                <CheckCircle className="w-6 h-6" />
                <span className="font-medium">All tags imported successfully!</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
