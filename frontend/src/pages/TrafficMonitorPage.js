import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Activity, Download, Trash2, RefreshCw, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatTimestamp, formatMs, getProtocolBadgeColor } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const TrafficMonitorPage = () => {
  const { token, canConfigure } = useAuth();
  const { currentProject, devices, pollingStatus } = useProject();
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchLogs = useCallback(async () => {
    if (!currentProject) return;
    
    setLoading(true);
    try {
      let url = `${API_URL}/api/projects/${currentProject.id}/traffic?limit=200`;
      if (deviceFilter !== 'all') url += `&device_id=${deviceFilter}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      
      const response = await axios.get(url, { headers });
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch traffic logs:', error);
    }
    setLoading(false);
  }, [currentProject, deviceFilter, statusFilter, token]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    let interval;
    if (autoRefresh && pollingStatus) {
      interval = setInterval(fetchLogs, 2000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, pollingStatus, fetchLogs]);

  const handleExport = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/projects/${currentProject.id}/traffic/export`,
        { headers, responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `traffic_log_${currentProject.id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Traffic log exported');
    } catch (error) {
      toast.error('Failed to export traffic log');
    }
  };

  const handleClear = async () => {
    try {
      await axios.delete(`${API_URL}/api/projects/${currentProject.id}/traffic`, { headers });
      setLogs([]);
      toast.success('Traffic logs cleared');
    } catch (error) {
      toast.error('Failed to clear traffic logs');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'timeout':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getFunctionCodeName = (code) => {
    const names = {
      1: 'Read Coils',
      2: 'Read Discrete',
      3: 'Read Holding',
      4: 'Read Input',
      5: 'Write Coil',
      6: 'Write Register',
      15: 'Write Coils',
      16: 'Write Registers'
    };
    return names[code] || `FC ${code}`;
  };

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20" data-testid="traffic-page-no-project">
        <Activity className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
        <p className="text-muted-foreground">Select a project from the sidebar to view traffic</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="traffic-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Traffic Monitor</h1>
          <p className="text-muted-foreground">Live Modbus communication logs for {currentProject.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            disabled={!pollingStatus}
            data-testid="auto-refresh-btn"
          >
            <RefreshCw className={cn("w-4 h-4 mr-1", autoRefresh && "animate-spin")} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} data-testid="export-traffic-btn">
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
          {canConfigure() && (
            <Button variant="outline" size="sm" onClick={handleClear} data-testid="clear-traffic-btn">
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-[180px]" data-testid="traffic-device-filter">
                <SelectValue placeholder="All Devices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                {devices.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="traffic-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="timeout">Timeout</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary">{logs.length} entries</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Traffic Table */}
      <Card>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[140px]">Timestamp</TableHead>
                <TableHead>Device</TableHead>
                <TableHead className="w-[80px]">Protocol</TableHead>
                <TableHead className="w-[120px]">Function</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Response</TableHead>
                <TableHead className="text-right w-[100px]">RTT</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {loading ? 'Loading...' : 'No traffic logs yet. Start polling to see data.'}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} data-testid={`traffic-row-${log.id}`}>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell className="text-sm">{log.device_name}</TableCell>
                    <TableCell>
                      <Badge className={getProtocolBadgeColor(log.protocol)}>
                        {log.protocol?.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {getFunctionCodeName(log.function_code)}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate" title={log.request_summary}>
                      {log.request_summary}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate" title={log.response_summary || log.error_details}>
                      {log.status === 'ok' ? log.response_summary : (
                        <span className="text-red-500">{log.error_details}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatMs(log.round_trip_ms)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(log.status)}
                        <span className={cn(
                          "text-xs capitalize",
                          log.status === 'ok' ? 'text-green-500' : 
                          log.status === 'error' ? 'text-red-500' : 'text-yellow-500'
                        )}>
                          {log.status}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
};
